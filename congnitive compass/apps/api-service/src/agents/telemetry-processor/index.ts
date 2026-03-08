import {
  KinesisStreamEvent,
  KinesisStreamBatchResponse,
  Context,
} from "aws-lambda";
import { z } from "zod";
import pino from "pino";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  TimestreamWriteClient,
  WriteRecordsCommand,
  _Record,
} from "@aws-sdk/client-timestream-write";
import { TelemetryEvent, Result } from "@cognitive-compass/shared/types";

const TIMESTREAM_DATABASE =
  process.env.TIMESTREAM_DATABASE ?? "cognitive-telemetry";
const TIMESTREAM_TABLE = process.env.TIMESTREAM_TABLE ?? "interaction-events";
const COGNITIVE_STATE_LAMBDA = process.env.COGNITIVE_STATE_LAMBDA_ARN ?? "";

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

function decodeRecord(data: string): Result<TelemetryEvent[], Error> {
  try {
    const decoded = Buffer.from(data, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const result = z.array(TelemetryEventSchema).safeParse(parsed);

    if (!result.success) {
      return { success: false, error: new Error(result.error.message) };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

function buildTimestreamRecord(event: TelemetryEvent): _Record {
  const payload = event.payload as Record<string, unknown> | undefined;

  return {
    Dimensions: [
      { Name: "userId", Value: event.userId },
      { Name: "sessionId", Value: event.sessionId },
      { Name: "projectId", Value: event.projectId },
      { Name: "eventType", Value: event.eventType },
    ],
    MeasureName: "telemetry_event",
    MeasureValueType: "MULTI",
    MeasureValues: [
      {
        Name: "lineNumber",
        Value: (event.lineNumber ?? 0).toString(),
        Type: "DOUBLE",
      },
      {
        Name: "columnNumber",
        Value: (event.columnNumber ?? 0).toString(),
        Type: "DOUBLE",
      },
    ],
    Time: event.timestamp.toString(),
    TimeUnit: "MILLISECONDS",
  };
}

async function writeToTimestream(
  records: _Record[],
  logger: pino.Logger,
): Promise<void> {
  if (records.length === 0) return;

  try {
    const client = new TimestreamWriteClient({});
    const command = new WriteRecordsCommand({
      DatabaseName: TIMESTREAM_DATABASE,
      TableName: TIMESTREAM_TABLE,
      Records: records,
    });

    await client.send(command);
  } catch (error) {
    logger.error({ error }, "Failed to write to Timestream");
    throw error;
  }
}

function triggerCognitiveStateEvaluation(
  events: TelemetryEvent[],
  logger: pino.Logger,
): void {
  if (!COGNITIVE_STATE_LAMBDA || events.length === 0) {
    return;
  }

  const client = new LambdaClient({});

  const payload = {
    body: JSON.stringify(events),
  };

  const command = new InvokeCommand({
    FunctionName: COGNITIVE_STATE_LAMBDA,
    InvocationType: "Event",
    Payload: JSON.stringify(payload),
  });

  void client.send(command);
  logger.info("Triggered cognitive state evaluation");
}

export async function handler(
  event: KinesisStreamEvent,
  context: Context,
): Promise<KinesisStreamBatchResponse> {
  const logger = pino({
    name: "telemetry-processor",
    requestId: context.awsRequestId,
  });

  const batchItemFailures: { itemIdentifier: string }[] = [];
  const allRecords: TelemetryEvent[] = [];
  const timestreamRecords: _Record[] = [];

  for (const record of event.Records) {
    const decodeResult = decodeRecord(record.kinesis.data);

    if (!decodeResult.success) {
      logger.error(
        {
          error: decodeResult.error,
          sequenceNumber: record.kinesis.sequenceNumber,
        },
        "Failed to decode record",
      );
      batchItemFailures.push({
        itemIdentifier: record.kinesis.sequenceNumber,
      });
      continue;
    }

    allRecords.push(...decodeResult.data);

    for (const event of decodeResult.data) {
      timestreamRecords.push(buildTimestreamRecord(event));
    }
  }

  if (timestreamRecords.length > 0) {
    try {
      await writeToTimestream(timestreamRecords, logger);
    } catch (error) {
      logger.error({ error }, "Failed to write to Timestream");
      for (const record of event.Records) {
        batchItemFailures.push({
          itemIdentifier: record.kinesis.sequenceNumber,
        });
      }
    }
  }

  triggerCognitiveStateEvaluation(allRecords, logger);

  logger.info(
    { recordCount: allRecords.length, failureCount: batchItemFailures.length },
    "Processed telemetry batch",
  );

  return { batchItemFailures };
}
