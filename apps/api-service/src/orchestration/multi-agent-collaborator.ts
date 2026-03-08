import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { BedrockClient } from "../utils/bedrock-client";
import {
  ExplanationRequest,
  ExplanationResponse,
  CognitiveState,
  Result,
} from "@cognitive-compass/shared/types";

const AGENT_ID = process.env.BEDROCK_AGENT_ID ?? "";
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID ?? "";
const COMPREHENSION_LAMBDA_ARN = process.env.COMPREHENSION_LAMBDA_ARN ?? "";

interface OrchestrationRequest {
  sessionId: string;
  userId: string;
  explanationRequest: ExplanationRequest;
  cognitiveState: CognitiveState;
}

function buildAgentInput(request: OrchestrationRequest): string {
  return JSON.stringify({
    sessionId: request.sessionId,
    userId: request.userId,
    cognitiveState: {
      state: request.cognitiveState.state,
      confidence: request.cognitiveState.confidence,
      detectedSignals: request.cognitiveState.detectedSignals,
    },
    explanationRequest: {
      code: request.explanationRequest.code,
      language: request.explanationRequest.language,
      context: request.explanationRequest.context,
      userQuery: request.explanationRequest.userQuery,
      confusionSignals: request.explanationRequest.confusionSignals,
    },
  });
}

const ExplanationResponseSchema = z.object({
  explanation: z.string(),
  keyConcepts: z.array(z.string()),
  dataFlow: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
  }),
  codeWalkthrough: z.array(z.unknown()),
  confidence: z.number(),
  reasoningTrace: z.string(),
  suggestedQuestions: z.array(z.string()),
  estimatedReadTime: z.number(),
});

async function invokeLambdaFallback(
  request: ExplanationRequest,
  logger: pino.Logger,
): Promise<Result<ExplanationResponse, Error>> {
  if (!COMPREHENSION_LAMBDA_ARN) {
    return {
      success: false,
      error: new Error("Comprehension Lambda ARN not configured"),
    };
  }

  try {
    const client = new LambdaClient({});
    const command = new InvokeCommand({
      FunctionName: COMPREHENSION_LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify({ body: JSON.stringify(request) }),
    });

    const response = await client.send(command);

    if (!response.Payload) {
      return { success: false, error: new Error("Empty Lambda response") };
    }

    const decoder = new TextDecoder();
    const responseStr = decoder.decode(response.Payload);
    const parsed = JSON.parse(responseStr);

    if (parsed.success === false) {
      return {
        success: false,
        error: new Error(parsed.error?.message || "Lambda invocation failed"),
      };
    }

    const validation = ExplanationResponseSchema.safeParse(parsed.data);

    if (!validation.success) {
      return { success: false, error: new Error(validation.error.message) };
    }

    return { success: true, data: parsed.data };
  } catch (error) {
    logger.error({ error }, "Lambda fallback invocation failed");
    return { success: false, error: error as Error };
  }
}

export async function orchestrate(
  request: OrchestrationRequest,
): Promise<Result<ExplanationResponse, Error>> {
  const logger = pino({
    name: "multi-agent-collaborator",
  }).child({
    sessionId: request.sessionId,
    correlationId: uuidv4(),
  });

  logger.info("Starting orchestration");

  if (!AGENT_ID || !AGENT_ALIAS_ID) {
    logger.warn("Bedrock agent not configured, using Lambda fallback");
    return invokeLambdaFallback(request.explanationRequest, logger);
  }

  const bedrockClient = BedrockClient.getInstance();
  const inputText = buildAgentInput(request);

  const agentResult = await bedrockClient.invokeAgent(
    AGENT_ID,
    AGENT_ALIAS_ID,
    request.sessionId,
    inputText,
  );

  if (!agentResult.success) {
    logger.error({ error: agentResult.error }, "Agent invocation failed");
    logger.info("Falling back to Lambda");
    return invokeLambdaFallback(request.explanationRequest, logger);
  }

  try {
    const parsed = JSON.parse(agentResult.data);
    const validation = ExplanationResponseSchema.safeParse(parsed);

    if (!validation.success) {
      logger.error(
        { error: validation.error },
        "Failed to parse agent response",
      );
      return invokeLambdaFallback(request.explanationRequest, logger);
    }

    const response: ExplanationResponse = {
      ...validation.data,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    logger.info({ responseId: response.id }, "Orchestration successful");

    return { success: true, data: response };
  } catch (error) {
    logger.error({ error }, "Failed to parse agent response");
    return invokeLambdaFallback(request.explanationRequest, logger);
  }
}
