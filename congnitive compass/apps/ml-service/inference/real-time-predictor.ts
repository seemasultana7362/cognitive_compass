import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from "@aws-sdk/client-sagemaker-runtime";
import { z } from "zod";
import type { Result } from "@cognitive-compass/shared/types";

const SAGEMAKER_ENDPOINT_NAME = process.env["SAGEMAKER_ENDPOINT_NAME"] ?? "";
const CONTENT_TYPE = "application/json";
const ACCEPT_TYPE = "application/json";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 500;
const BACKOFF_MULTIPLIER = 2;
const FEATURE_VECTOR_LENGTH = 50;
const SCROLL_OSC_INDEX = 4;
const UNDO_INDEX = 5;
const CONFUSION_THRESHOLD = 0.7;

export interface PredictionInput {
  features: number[];
}

export interface PredictionOutput {
  state: "focused" | "exploring" | "confused" | "stuck";
  confidence: number;
  predictedTimeToHelp: number;
}

export interface RealTimePredictor {
  predict(features: number[]): Promise<Result<PredictionOutput, Error>>;
}

const PredictionInputSchema = z.object({
  features: z.array(z.number().finite()).length(FEATURE_VECTOR_LENGTH),
});

const PredictionOutputSchema = z.object({
  state: z.enum(["focused", "exploring", "confused", "stuck"]),
  confidence: z.number().min(0).max(1),
  predictedTimeToHelp: z.number(),
});

export class SageMakerPredictor implements RealTimePredictor {
  private client: SageMakerRuntimeClient;

  constructor() {
    this.client = new SageMakerRuntimeClient({
      region: process.env["AWS_REGION"] ?? "us-east-1",
    });
  }

  async predict(features: number[]): Promise<Result<PredictionOutput, Error>> {
    const validation = PredictionInputSchema.safeParse({ features });
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const body = new TextEncoder().encode(JSON.stringify({ features }));

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const cmd = new InvokeEndpointCommand({
          EndpointName: SAGEMAKER_ENDPOINT_NAME,
          ContentType: CONTENT_TYPE,
          Accept: ACCEPT_TYPE,
          Body: body,
        });

        const response = await this.client.send(cmd);

        if (!response.Body) {
          return {
            success: false,
            error: new Error("Empty response body from SageMaker"),
          };
        }

        const decoded = new TextDecoder().decode(response.Body);
        const parsed = JSON.parse(decoded);
        const outputValidation = PredictionOutputSchema.safeParse(parsed);

        if (!outputValidation.success) {
          return { success: false, error: outputValidation.error };
        }

        return { success: true, data: outputValidation.data };
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        if (
          err.name === "ServiceUnavailableException" ||
          err.name === "NetworkingError"
        ) {
          const delay =
            BASE_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return { success: false, error: error as Error };
      }
    }

    return { success: false, error: new Error("Max retry attempts exceeded") };
  }
}

export class LocalPredictor implements RealTimePredictor {
  async predict(features: number[]): Promise<Result<PredictionOutput, Error>> {
    const scrollOscillation = features[SCROLL_OSC_INDEX] ?? 0;
    const undoCount = features[UNDO_INDEX] ?? 0;

    if (scrollOscillation > CONFUSION_THRESHOLD || undoCount > 3) {
      return Promise.resolve({
        success: true,
        data: {
          state: "confused",
          confidence: scrollOscillation,
          predictedTimeToHelp: 15,
        },
      });
    }

    return Promise.resolve({
      success: true,
      data: {
        state: "focused",
        confidence: 1 - scrollOscillation,
        predictedTimeToHelp: 60,
      },
    });
  }
}

export {
  SageMakerPredictor,
  LocalPredictor,
  type RealTimePredictor,
  type PredictionOutput,
};
