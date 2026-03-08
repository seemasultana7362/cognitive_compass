import boto3
import pandas as pd
import numpy as np
import json
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}',
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

TIMESTREAM_DATABASE = os.environ.get("TIMESTREAM_DATABASE", "cognitive-telemetry")
TIMESTREAM_TABLE = os.environ.get("TIMESTREAM_TABLE", "interaction-events")
S3_OUTPUT_BUCKET = os.environ.get("S3_OUTPUT_BUCKET", "cognitive-compass-data")
S3_OUTPUT_KEY = os.environ.get("S3_OUTPUT_KEY", "training-data/features.csv")
QUERY_WINDOW_HOURS = 168
FEATURE_VECTOR_SIZE = 50
WINDOWS_MS = [5000, 30000, 120000, 300000]
FEATURES_PER_WINDOW = 12
SCROLL_OSC_NORMALIZATION = 5
MIN_SCROLL_EVENTS = 3
CONFUSION_SCROLL_OSC_THRESHOLD = 0.6
CONFUSION_UNDO_THRESHOLD = 3
CONFUSION_TAB_SWITCH_THRESHOLD = 5
WINDOW_30S_MS = 30000
SLIDING_WINDOW_MS = 300000


def query_timestream(client: boto3.client, hours: int) -> pd.DataFrame:
    query_string = f"""
        SELECT userId, sessionId, eventType, time, measure_value::varchar as payload
        FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
        WHERE time > ago({hours}h)
        ORDER BY time ASC
    """

    rows = []
    next_token = None

    while True:
        params = {"QueryString": query_string}
        if next_token:
            params["NextToken"] = next_token

        response = client.query(**params)

        for row in response["Rows"]:
            data = row["Data"]
            row_dict = {
                "userId": data[0]["ScalarValue"],
                "sessionId": data[1]["ScalarValue"],
                "eventType": data[2]["ScalarValue"],
                "timestamp_ms": int(
                    pd.to_datetime(data[3]["ScalarValue"]).timestamp() * 1000
                ),
                "payload": data[4]["ScalarValue"],
            }
            rows.append(row_dict)

        next_token = response.get("NextToken")
        if not next_token:
            break

    return pd.DataFrame(
        rows, columns=["userId", "sessionId", "eventType", "timestamp_ms", "payload"]
    )


def calculate_scroll_oscillation(events: pd.DataFrame) -> float:
    scroll_events = events[events["eventType"] == "scroll"]

    if len(scroll_events) < MIN_SCROLL_EVENTS:
        return 0.0

    direction_changes = 0
    prev_direction = None

    for _, row in scroll_events.iterrows():
        payload = json.loads(row["payload"])
        direction = payload.get("direction", 0)

        if prev_direction is not None and direction != prev_direction:
            direction_changes += 1

        prev_direction = direction

    return min(1.0, direction_changes / SCROLL_OSC_NORMALIZATION)


def compute_features_for_session(session_df: pd.DataFrame) -> np.ndarray:
    features = np.zeros(FEATURE_VECTOR_SIZE, dtype=np.float32)

    if session_df.empty:
        return features

    max_timestamp_ms = session_df["timestamp_ms"].max()

    for windowIdx, window_ms in enumerate(WINDOWS_MS):
        window_start = max_timestamp_ms - window_ms
        window_events = session_df[session_df["timestamp_ms"] >= window_start]

        base = windowIdx * FEATURES_PER_WINDOW

        features[base + 0] = len(window_events[window_events["eventType"] == "cursor"])
        features[base + 1] = len(window_events[window_events["eventType"] == "scroll"])
        features[base + 2] = len(
            window_events[window_events["eventType"] == "keypress"]
        )
        features[base + 3] = len(
            window_events[window_events["eventType"] == "tab_switch"]
        )
        features[base + 4] = calculate_scroll_oscillation(window_events)

        undo_count = 0
        delete_count = 0

        for _, row in window_events.iterrows():
            if row["eventType"] == "keypress":
                payload = json.loads(row["payload"])
                if payload.get("isUndo", False):
                    undo_count += 1
                if payload.get("isDelete", False):
                    delete_count += 1

        features[base + 5] = undo_count
        features[base + 6] = delete_count

        if len(window_events) >= 2:
            sorted_times = window_events["timestamp_ms"].sort_values().values
            inter_event_intervals = np.diff(sorted_times)
            features[base + 7] = np.mean(inter_event_intervals)
            features[base + 8] = np.std(inter_event_intervals)
        else:
            features[base + 7] = 0.0
            features[base + 8] = 0.0

    features[48] = features[0] - features[12]
    features[49] = 1.0 if features[4] > 0.5 else 0.0

    return features


def label_session(session_df: pd.DataFrame) -> int:
    if session_df.empty:
        return 0

    max_timestamp_ms = session_df["timestamp_ms"].max()
    min_timestamp_ms = session_df["timestamp_ms"].min()

    window_start = min_timestamp_ms
    while window_start + WINDOW_30S_MS <= max_timestamp_ms:
        window_end = window_start + WINDOW_30S_MS
        window_events = session_df[
            (session_df["timestamp_ms"] >= window_start)
            & (session_df["timestamp_ms"] < window_end)
        ]

        scroll_osc = calculate_scroll_oscillation(window_events)

        undo_count = 0
        tab_switch_count = 0

        for _, row in window_events.iterrows():
            if row["eventType"] == "keypress":
                payload = json.loads(row["payload"])
                if payload.get("isUndo", False):
                    undo_count += 1
            elif row["eventType"] == "tab_switch":
                tab_switch_count += 1

        if (
            scroll_osc > CONFUSION_SCROLL_OSC_THRESHOLD
            and undo_count > CONFUSION_UNDO_THRESHOLD
        ):
            return 1
        if tab_switch_count > CONFUSION_TAB_SWITCH_THRESHOLD:
            return 1

        window_start += WINDOW_30S_MS

    return 0


def main():
    client = boto3.client(
        "timestream-query", region_name=os.environ.get("AWS_REGION", "us-east-1")
    )

    logger.info("Querying Timestream for events")
    raw_df = query_timestream(client, QUERY_WINDOW_HOURS)
    logger.info(f"Retrieved {len(raw_df)} raw events")

    grouped = raw_df.groupby(["userId", "sessionId"])

    all_features = []
    all_labels = []

    for (userId, sessionId), session_df in grouped:
        max_timestamp_ms = session_df["timestamp_ms"].max()
        min_timestamp_ms = session_df["timestamp_ms"].min()

        window_start = min_timestamp_ms
        while window_start + SLIDING_WINDOW_MS <= max_timestamp_ms:
            window_end = window_start + SLIDING_WINDOW_MS
            window_df = session_df[
                (session_df["timestamp_ms"] >= window_start)
                & (session_df["timestamp_ms"] < window_end)
            ]

            if not window_df.empty:
                features = compute_features_for_session(window_df)
                label = label_session(window_df)

                all_features.append(features)
                all_labels.append(label)

            window_start += SLIDING_WINDOW_MS // 2

    feature_cols = [f"f{i}" for i in range(FEATURE_VECTOR_SIZE)]
    df = pd.DataFrame(all_features, columns=feature_cols)
    df["label"] = all_labels

    logger.info(f"Created dataset with {len(df)} samples")
    logger.info(f"Class distribution: {df['label'].value_counts().to_dict()}")
    logger.info(f"Feature means: {df.drop('label', axis=1).mean().to_dict()}")

    s3_client = boto3.client("s3")
    s3_client.put_object(
        Bucket=S3_OUTPUT_BUCKET, Key=S3_OUTPUT_KEY, Body=df.to_csv(index=False).encode()
    )
    logger.info(f"Uploaded training data to s3://{S3_OUTPUT_BUCKET}/{S3_OUTPUT_KEY}")


if __name__ == "__main__":
    main()
