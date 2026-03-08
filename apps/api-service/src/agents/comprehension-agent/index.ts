import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { BedrockClient } from "../../utils/bedrock-client";
import {
  ExplanationRequest,
  ExplanationResponse,
  Result,
} from "@cognitive-compass/shared/types";

const MODEL_ID = "amazon.nova-pro-v1:0";
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.1;

const ConfusionSignalSchema = z.object({
  type: z.string(),
  confidence: z.number(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()),
});

const ExplanationRequestSchema = z.object({
  code: z.string(),
  language: z.string(),
  context: z.string(),
  userQuery: z.string(),
  confusionSignals: z.array(ConfusionSignalSchema),
  projectContext: z.string().optional(),
});

const DataNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum([
    "variable",
    "function",
    "class",
    "module",
    "parameter",
    "return",
  ]),
  description: z.string().optional(),
  codeSnippet: z.string().optional(),
  lineRange: z.tuple([z.number(), z.number()]).optional(),
});

const DataEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
  type: z.enum(["data_flow", "control_flow", "dependency", "reference"]),
});

const DataFlowGraphSchema = z.object({
  nodes: z.array(DataNodeSchema),
  edges: z.array(DataEdgeSchema),
});

const CodeStepSchema = z.object({
  stepNumber: z.number(),
  lineNumber: z.number(),
  description: z.string(),
  variables: z.record(z.unknown()),
  stdout: z.string().optional(),
});

const ExplanationResponseSchema = z.object({
  explanation: z.string(),
  keyConcepts: z.array(z.string()),
  dataFlow: DataFlowGraphSchema,
  codeWalkthrough: z.array(CodeStepSchema),
  confidence: z.number(),
  reasoningTrace: z.string(),
  suggestedQuestions: z.array(z.string()),
  estimatedReadTime: z.number(),
});

function buildPrompt(request: ExplanationRequest): string {
  return `You are an expert code comprehension assistant. Analyze the following code and provide a detailed explanation.

Code:
${request.code}

Language: ${request.language}
Context: ${request.context}
User Query: ${request.userQuery}
${request.confusionSignals.length > 0 ? `Confusion Signals: ${JSON.stringify(request.confusionSignals)}` : ""}
${request.projectContext ? `Project Context: ${request.projectContext}` : ""}

Please return a JSON object with the following structure:
{
  "explanation": "detailed explanation of the code",
  "keyConcepts": ["concept1", "concept2", ...],
  "dataFlow": {
    "nodes": [{"id": "...", "label": "...", "type": "variable|function|class|module|parameter|return", ...}],
    "edges": [{"from": "...", "to": "...", "label": "...", "type": "data_flow|control_flow|dependency|reference"}]
  },
  "codeWalkthrough": [{"stepNumber": 1, "lineNumber": 10, "description": "...", "variables": {...}, "stdout": "..."}],
  "confidence": 0.95,
  "reasoningTrace": "step-by-step reasoning",
  "suggestedQuestions": ["question1", "question2", "question3"],
  "estimatedReadTime": 120
}

Return ONLY valid JSON, no additional text.`;
}

function parseModelResponse(raw: string): Result<ExplanationResponse, Error> {
  try {
    const parsed = JSON.parse(raw);
    const result = ExplanationResponseSchema.safeParse(parsed);

    if (!result.success) {
      return { success: false, error: new Error(result.error.message) };
    }

    const response: ExplanationResponse = {
      ...result.data,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<Result<ExplanationResponse, Error>> {
  const logger = pino({
    name: "comprehension-agent",
    requestId: context.awsRequestId,
  });

  if (!event.body) {
    return { success: false, error: new Error("Missing request body") };
  }

  const parseResult = ExplanationRequestSchema.safeParse(
    JSON.parse(event.body),
  );

  if (!parseResult.success) {
    logger.error({ error: parseResult.error }, "Invalid request body");
    return { success: false, error: new Error(parseResult.error.message) };
  }

  const request = parseResult.data;
  const bedrockClient = BedrockClient.getInstance();

  logger.info({ request }, "Invoking model");

  const modelResult = await bedrockClient.invokeModel(
    MODEL_ID,
    buildPrompt(request),
    MAX_TOKENS,
    TEMPERATURE,
  );

  if (!modelResult.success) {
    logger.error({ error: modelResult.error }, "Model invocation failed");
    return { success: false, error: modelResult.error };
  }

  const parsedResult = parseModelResponse(modelResult.data);

  if (!parsedResult.success) {
    logger.error(
      { error: parsedResult.error },
      "Failed to parse model response",
    );
    return { success: false, error: parsedResult.error };
  }

  logger.info(
    { responseId: parsedResult.data.id },
    "Successfully generated explanation",
  );

  return parsedResult;
}
