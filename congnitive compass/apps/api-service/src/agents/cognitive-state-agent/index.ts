import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { z } from "zod";
import pino from "pino";
import {
  TimestreamWriteClient,
  WriteRecordsCommand,
} from "@aws-sdk/client-timestream-write";
import {
  TelemetryEvent,
  CognitiveState,
  CognitiveStateState,
  ConfusionSignal,
  Result,
} from "@cognitive-compass/shared/types";
import {
  extractFeatures,
  calculateScrollOscillation,
  detectLongPause,
} from "@cognitive-compass/shared/utils/telemetry-helpers";
import {
  SageMakerPredictor,
  LocalPredictor,
} from "@cognitive-compass/ml-service/inference/real-time-predictor";

const SAGEMAKER_ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME ?? "";
const SCROLL_CONFUSION_THRESHOLD = 0.7;
const LONG_PAUSE_THRESHOLD = 0.7;
const TIMESTREAM_DATABASE = "cognitive-telemetry";
const TIMESTREAM_TABLE = "interaction-events";

const TelemetryEventSchema = z.object({
  timestamp: z.number(),
  userId: z.string(),
  sessionId: z.string(),
  projectId: z.string(),
  eventType: z.string(),
  payload: z.unknown(),
  filePath: z.string().optional(),
  lineNumber: z.number().optional(),
  columnNumber: z.number().optional(),
});

const TelemetryEventBatchSchema = z.array(TelemetryEventSchema);

function localFallbackDetection(events: TelemetryEvent[]): CognitiveState {
  const oscillation = calculateScrollOscillation(events);
  const pause = detectLongPause(events);

  const detectedSignals: ConfusionSignal[] = [];

  if (oscillation > SCROLL_CONFUSION_THRESHOLD) {
    detectedSignals.push({
      type: "scroll_oscillation",
      confidence: oscillation,
      timestamp: Date.now(),
      metadata: { oscillationLevel: oscillation },
    });
  }

  if (pause > LONG_PAUSE_THRESHOLD) {
    detectedSignals.push({
      type: "long_pause",
      confidence: 0.8,
      timestamp: Date.now(),
      metadata: { pauseDuration: pause },
    });
  }

  const state: CognitiveStateState =
    oscillation > SCROLL_CONFUSION_THRESHOLD ? "confused" : "exploring";

  return {
    state,
    confidence: oscillation > SCROLL_CONFUSION_THRESHOLD ? oscillation : 0.9,
    detectedSignals,
    predictedTimeToHelp:
      state === "confused" ? Math.round(300 + Math.random() * 600) : 0,
    recommendedAction: state === "confused" ? "provide_explanation" : "none",
    learningStyle: "mixed",
  };
}

async function writeToTimestream(
  state: CognitiveState,
  userId: string,
  sessionId: string,
  logger: pino.Logger,
): Promise<void> {
  try {
    const client = new TimestreamWriteClient({});
    const record = {
      Dimensions: [
        { Name: "userId", Value: userId },
        { Name: "sessionId", Value: sessionId },
        { Name: "state", Value: state.state },
        { Name: "confidence", Value: state.confidence.toString() },
      ],
      MeasureName: "cognitive_state",
      MeasureValueType: "MULTI",
      MeasureValues: [
        {
          Name: "confidence",
          Value: state.confidence.toString(),
          Type: "DOUBLE",
        },
        {
          Name: "predictedTimeToHelp",
          Value: state.predictedTimeToHelp.toString(),
          Type: "BIGINT",
        },
      ],
      Time: Date.now().toString(),
      TimeUnit: "MILLISECONDS",
    };

    const command = new WriteRecordsCommand({
      DatabaseName: TIMESTREAM_DATABASE,
      TableName: TIMESTREAM_TABLE,
      Records: [record],
    });

    await client.send(command);
  } catch (error) {
    logger.error({ error }, "Failed to write to Timestream");
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<Result<CognitiveState, Error>> {
  const logger = pino({
    name: "cognitive-state-agent",
    requestId: context.awsRequestId,
  });

  let events: TelemetryEvent[];

  if (event.body) {
    const parseResult = TelemetryEventBatchSchema.safeParse(
      JSON.parse(event.body),
    );

    if (!parseResult.success) {
      logger.error({ error: parseResult.error }, "Invalid telemetry batch");
      return { success: false, error: new Error(parseResult.error.message) };
    }

    events = parseResult.data;
  } else {
    logger.error("Missing request body");
    return { success: false, error: new Error("Missing request body") };
  }

  const features = extractFeatures(events);
  const oscillation = calculateScrollOscillation(events);
  const pause = detectLongPause(events);

  let cognitiveState: CognitiveState;

  const predictor = SAGEMAKER_ENDPOINT_NAME
    ? new SageMakerPredictor()
    : new LocalPredictor();

  const predictionResult = await predictor.predict(features);

  if (predictionResult.success) {
    cognitiveState = {
      state: predictionResult.data.state as CognitiveStateState,
      confidence: predictionResult.data.confidence,
      detectedSignals: [],
      predictedTimeToHelp: predictionResult.data.predictedTimeToHelp,
      recommendedAction: "provide_explanation",
      learningStyle: "mixed",
    };
  } else {
    logger.warn("Prediction failed, using local fallback");
    cognitiveState = localFallbackDetection(events);
  }

  const detectedSignals: ConfusionSignal[] = [];

  if (oscillation > SCROLL_CONFUSION_THRESHOLD) {
    detectedSignals.push({
      type: "scroll_oscillation",
      confidence: oscillation,
      timestamp: Date.now(),
      metadata: { oscillationLevel: oscillation },
    });
  }

  if (pause > LONG_PAUSE_THRESHOLD) {
    detectedSignals.push({
      type: "long_pause",
      confidence: 0.8,
      timestamp: Date.now(),
      metadata: { pauseDuration: pause },
    });
  }

  cognitiveState.detectedSignals = detectedSignals;

  const userId = events[0]?.userId ?? "unknown";
  const sessionId = events[0]?.sessionId ?? "unknown";

  void writeToTimestream(cognitiveState, userId, sessionId, logger);

  logger.info({ cognitiveState }, "Cognitive state evaluated");

  return { success: true, data: cognitiveState };
}
