import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import numpy as np
import pandas as pd
import boto3
import onnx
import onnxruntime
import os
import logging
import json
import joblib
import io

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}',
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

INPUT_SIZE = 50
SEQUENCE_LENGTH = 10
LSTM_INPUT_SIZE = INPUT_SIZE // SEQUENCE_LENGTH
LSTM_HIDDEN_SIZE = 64
LSTM_NUM_LAYERS = 2
LSTM_DROPOUT = 0.3
LEARNING_RATE = 0.001
NUM_EPOCHS = 50
BATCH_SIZE = 32
VALIDATION_SPLIT = 0.2
RANDOM_SEED = 42

RF_N_ESTIMATORS = 100
RF_MAX_DEPTH = 10

S3_MODEL_BUCKET = os.environ.get("S3_MODEL_BUCKET", "cognitive-compass-models")
S3_DATA_BUCKET = os.environ.get("S3_DATA_BUCKET", "cognitive-compass-data")
S3_TRAINING_DATA_KEY = os.environ.get(
    "S3_TRAINING_DATA_KEY", "training-data/features.csv"
)

LSTM_WEIGHT = 0.6
RF_WEIGHT = 0.4
TIME_HELP_SCALE = 120.0
ACCURACY_THRESHOLD = 0.85


class LSTMConfusionModel(nn.Module):
    def __init__(
        self, input_size: int, hidden_size: int, num_layers: int, dropout: float
    ) -> None:
        super().__init__()
        self.lstm = nn.LSTM(
            input_size, hidden_size, num_layers, batch_first=True, dropout=dropout
        )
        self.fc1 = nn.Linear(hidden_size, 64)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(64, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        out = lstm_out[:, -1, :]
        out = self.fc1(out)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc2(out)
        return out


class EnsemblePredictor:
    def __init__(
        self, lstm_model: LSTMConfusionModel, rf_model: RandomForestClassifier
    ) -> None:
        self.lstm_model = lstm_model
        self.rf_model = rf_model
        self.lstm_model.eval()

    def predict(self, features: np.ndarray) -> dict:
        lstm_input = torch.tensor(
            features.reshape(1, SEQUENCE_LENGTH, LSTM_INPUT_SIZE), dtype=torch.float32
        )
        with torch.no_grad():
            lstm_logits = self.lstm_model(lstm_input)
            lstm_probs = torch.softmax(lstm_logits, dim=1)
            lstm_prob = lstm_probs[0, 1].item()

        rf_prob = self.rf_model.predict_proba(features.reshape(1, -1))[0][1]

        final_prob = LSTM_WEIGHT * lstm_prob + RF_WEIGHT * rf_prob

        state = "confused" if final_prob > 0.5 else "focused"
        predicted_time_to_help = max(0.0, (0.5 - final_prob) * TIME_HELP_SCALE)

        return {
            "state": state,
            "confidence": float(final_prob),
            "predictedTimeToHelp": predicted_time_to_help,
        }


def load_training_data(
    s3_client: boto3.client, bucket: str, key: str
) -> tuple[np.ndarray, np.ndarray]:
    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response["Body"].read().decode("utf-8")
    df = pd.read_csv(io.StringIO(content))

    X = df.drop("label", axis=1).values.astype(np.float32)
    y = df["label"].values.astype(np.int64)

    return X, y


def train_lstm(X_train: np.ndarray, y_train: np.ndarray) -> LSTMConfusionModel:
    X_reshaped = X_train.reshape(-1, SEQUENCE_LENGTH, LSTM_INPUT_SIZE)

    X_train_split, X_val_split, y_train_split, y_val_split = train_test_split(
        X_reshaped,
        y_train,
        test_size=VALIDATION_SPLIT,
        random_state=RANDOM_SEED,
        stratify=y_train,
    )

    train_dataset = torch.utils.data.TensorDataset(
        torch.tensor(X_train_split, dtype=torch.float32),
        torch.tensor(y_train_split, dtype=torch.long),
    )
    train_loader = torch.utils.data.DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True
    )

    model = LSTMConfusionModel(
        LSTM_INPUT_SIZE, LSTM_HIDDEN_SIZE, LSTM_NUM_LAYERS, LSTM_DROPOUT
    )

    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.CrossEntropyLoss()

    best_val_loss = float("inf")

    for epoch in range(NUM_EPOCHS):
        model.train()
        epoch_loss = 0.0

        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        avg_train_loss = epoch_loss / len(train_loader)

        model.eval()
        with torch.no_grad():
            val_outputs = model(torch.tensor(X_val_split, dtype=torch.float32))
            val_loss = criterion(
                val_outputs, torch.tensor(y_val_split, dtype=torch.long)
            ).item()

        logger.info(
            f"Epoch {epoch + 1}/{NUM_EPOCHS} - Train Loss: {avg_train_loss:.4f}, Val Loss: {val_loss:.4f}"
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), "best_lstm.pt")

    model.load_state_dict(torch.load("best_lstm.pt"))
    logger.info("Loaded best LSTM model checkpoint")

    return model


def train_random_forest(
    X_train: np.ndarray, y_train: np.ndarray
) -> RandomForestClassifier:
    clf = RandomForestClassifier(
        n_estimators=RF_N_ESTIMATORS, max_depth=RF_MAX_DEPTH, random_state=RANDOM_SEED
    )
    clf.fit(X_train, y_train)
    logger.info("Random Forest training completed")
    return clf


def export_to_onnx(model: LSTMConfusionModel, output_path: str) -> None:
    model.eval()
    dummy_input = torch.randn(1, SEQUENCE_LENGTH, LSTM_INPUT_SIZE)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=17,
    )

    ort_session = onnxruntime.InferenceSession(output_path)
    ort_session.run(None, {"input": dummy_input.numpy()})
    logger.info(f"ONNX model exported and verified: {output_path}")


def evaluate_model(
    ensemble: EnsemblePredictor, X_test: np.ndarray, y_test: np.ndarray
) -> dict:
    y_pred = []

    for i in range(len(X_test)):
        result = ensemble.predict(X_test[i])
        y_pred.append(1 if result["state"] == "confused" else 0)

    y_pred = np.array(y_pred)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    logger.info(f"Accuracy: {accuracy:.4f}")
    logger.info(f"Precision: {precision:.4f}")
    logger.info(f"Recall: {recall:.4f}")
    logger.info(f"F1: {f1:.4f}")

    assert accuracy >= ACCURACY_THRESHOLD, (
        f"Accuracy {accuracy:.3f} below threshold {ACCURACY_THRESHOLD}"
    )

    return {"accuracy": accuracy, "precision": precision, "recall": recall, "f1": f1}


def main():
    torch.manual_seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    s3 = boto3.client("s3")

    logger.info("Loading training data from S3")
    X, y = load_training_data(s3, S3_DATA_BUCKET, S3_TRAINING_DATA_KEY)
    logger.info(f"Loaded {len(X)} samples with {X.shape[1]} features")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )
    logger.info(f"Train: {len(X_train)}, Test: {len(X_test)}")

    logger.info("Training LSTM model")
    lstm = train_lstm(X_train, y_train)

    logger.info("Training Random Forest model")
    rf = train_random_forest(X_train, y_train)

    ensemble = EnsemblePredictor(lstm, rf)

    logger.info("Evaluating ensemble model")
    evaluate_model(ensemble, X_test, y_test)

    logger.info("Exporting models")
    export_to_onnx(lstm, "model.onnx")
    joblib.dump(rf, "rf_model.joblib")

    logger.info("Uploading models to S3")
    s3.upload_file("model.onnx", S3_MODEL_BUCKET, "models/model.onnx")
    s3.upload_file("rf_model.joblib", S3_MODEL_BUCKET, "models/rf_model.joblib")
    logger.info("Model training and upload completed")


if __name__ == "__main__":
    main()
