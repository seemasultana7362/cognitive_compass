import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { z } from "zod";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { orchestrate } from "../orchestration/multi-agent-collaborator";
import {
  ExplanationRequest,
  CognitiveState,
  Result,
} from "@cognitive-compass/shared/types";

const SESSIONS_TABLE = process.env.CONNECTIONS_TABLE ?? "";
const API_VERSION = "0.1.0";

const ExplanationRequestSchema = z.object({
  code: z.string(),
  language: z.string(),
  context: z.string(),
  userQuery: z.string(),
  confusionSignals: z.array(z.unknown()),
  projectContext: z.string().optional(),
});

function buildDynamoClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient({});
  return DynamoDBDocumentClient.from(client);
}

async function handleExplain(
  body: string,
  logger: pino.Logger,
): Promise<APIGatewayProxyResultV2> {
  const parseResult = ExplanationRequestSchema.safeParse(JSON.parse(body));

  if (!parseResult.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: parseResult.error.message }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const request: ExplanationRequest = parseResult.data;
  const defaultCognitiveState: CognitiveState = {
    state: "exploring",
    confidence: 0.5,
    detectedSignals: [],
    predictedTimeToHelp: 0,
    recommendedAction: "none",
    learningStyle: "mixed",
  };

  const orchestrationResult = await orchestrate({
    sessionId: uuidv4(),
    userId: "http",
    explanationRequest: request,
    cognitiveState: defaultCognitiveState,
  });

  if (orchestrationResult.success) {
    return {
      statusCode: 200,
      body: JSON.stringify(orchestrationResult.data),
      headers: { "Content-Type": "application/json" },
    };
  }

  logger.error({ error: orchestrationResult.error }, "Orchestration failed");

  return {
    statusCode: 500,
    body: JSON.stringify({ error: "Internal server error" }),
    headers: { "Content-Type": "application/json" },
  };
}

async function handleGetSession(
  sessionId: string,
  docClient: DynamoDBDocumentClient,
): Promise<APIGatewayProxyResultV2> {
  const result = await docClient.send(
    new GetCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
    }),
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Session not found" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
    headers: { "Content-Type": "application/json" },
  };
}

function handleHealth(): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "healthy",
      timestamp: Date.now(),
      version: API_VERSION,
    }),
    headers: { "Content-Type": "application/json" },
  };
}

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> {
  const logger = pino({
    name: "http-handler",
    requestId: context.awsRequestId,
  });

  const docClient = buildDynamoClient();

  try {
    switch (event.routeKey) {
      case "POST /explain": {
        if (!event.body) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing request body" }),
            headers: { "Content-Type": "application/json" },
          };
        }
        return handleExplain(event.body, logger);
      }

      case "GET /sessions/{sessionId}": {
        const sessionId = event.pathParameters?.sessionId;
        if (!sessionId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing sessionId" }),
            headers: { "Content-Type": "application/json" },
          };
        }
        return handleGetSession(sessionId, docClient);
      }

      case "GET /health": {
        return handleHealth();
      }

      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Not found" }),
          headers: { "Content-Type": "application/json" },
        };
    }
  } catch (error) {
    logger.error({ error }, "Unhandled error");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
      headers: { "Content-Type": "application/json" },
    };
  }
}
