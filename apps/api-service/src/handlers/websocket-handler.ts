import { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";
import { z } from "zod";
import pino from "pino";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { orchestrate } from "../orchestration/multi-agent-collaborator";
import { ExplanationRequest, Result } from "@cognitive-compass/shared/types";

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE ?? "";

const WebSocketMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
  timestamp: z.number(),
});

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

function buildApiGwClient(
  domainName: string,
  stage: string,
): ApiGatewayManagementApiClient {
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
}

async function handleConnect(
  event: APIGatewayProxyWebsocketEventV2,
  docClient: DynamoDBDocumentClient,
): Promise<{ statusCode: number }> {
  const connectionId = event.requestContext.connectionId;
  const queryParams = event.queryStringParameters ?? {};
  const token = queryParams.token ?? "";
  const userId = token ? Buffer.from(token, "base64").toString() : connectionId;
  const sessionId = uuid();

  await docClient.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        sessionId,
        connectionId,
        userId,
        connectedAt: Date.now(),
      },
    }),
  );

  await docClient.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        sessionId,
        userId,
        connectedAt: Date.now(),
      },
    }),
  );

  return { statusCode: 200 };
}

async function handleDisconnect(
  connectionId: string,
  sessionId: string,
  docClient: DynamoDBDocumentClient,
): Promise<{ statusCode: number }> {
  await docClient.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { sessionId },
    }),
  );

  await docClient.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    }),
  );

  return { statusCode: 200 };
}

async function postToConnection(
  apigwClient: ApiGatewayManagementApiClient,
  connectionId: string,
  data: unknown,
  docClient: DynamoDBDocumentClient,
): Promise<void> {
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(data)),
    });

    await apigwClient.send(command);
  } catch (error) {
    if (error instanceof GoneException) {
      await docClient.send(
        new DeleteCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId },
        }),
      );
    } else {
      throw error;
    }
  }
}

async function handleDefault(
  event: APIGatewayProxyWebsocketEventV2,
  docClient: DynamoDBDocumentClient,
  apigwClient: ApiGatewayManagementApiClient,
): Promise<{ statusCode: number }> {
  const logger = pino({ name: "websocket-handler" });

  if (!event.body) {
    return { statusCode: 400 };
  }

  const messageParseResult = WebSocketMessageSchema.safeParse(
    JSON.parse(event.body),
  );

  if (!messageParseResult.success) {
    logger.warn({ error: messageParseResult.error }, "Invalid message format");
    return { statusCode: 400 };
  }

  const message = messageParseResult.data;
  const connectionId = event.requestContext.connectionId;

  switch (message.type) {
    case "explanation_request": {
      const requestParseResult = ExplanationRequestSchema.safeParse(
        message.payload,
      );

      if (!requestParseResult.success) {
        logger.warn(
          { error: requestParseResult.error },
          "Invalid explanation request",
        );
        return { statusCode: 400 };
      }

      const request: ExplanationRequest = requestParseResult.data;
      const orchestrationResult = await orchestrate({
        sessionId: uuid(),
        userId: connectionId,
        explanationRequest: request,
        cognitiveState: {
          state: "exploring",
          confidence: 0.5,
          detectedSignals: [],
          predictedTimeToHelp: 0,
          recommendedAction: "none",
          learningStyle: "mixed",
        },
      });

      if (orchestrationResult.success) {
        await postToConnection(
          apigwClient,
          connectionId,
          {
            type: "explanation_response",
            payload: orchestrationResult.data,
            timestamp: Date.now(),
          },
          docClient,
        );
      } else {
        await postToConnection(
          apigwClient,
          connectionId,
          {
            type: "error",
            payload: { message: orchestrationResult.error.message },
            timestamp: Date.now(),
          },
          docClient,
        );
      }

      return { statusCode: 200 };
    }

    case "ping": {
      await postToConnection(
        apigwClient,
        connectionId,
        {
          type: "pong",
          payload: {},
          timestamp: Date.now(),
        },
        docClient,
      );
      return { statusCode: 200 };
    }

    default:
      logger.warn({ type: message.type }, "Unknown message type");
      return { statusCode: 400 };
  }
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function handler(
  event: APIGatewayProxyWebsocketEventV2,
  context: Context,
): Promise<{ statusCode: number }> {
  const logger = pino({
    name: "websocket-handler",
    requestId: context.awsRequestId,
  });

  const docClient = buildDynamoClient();

  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  if (!domainName || !stage) {
    return { statusCode: 500 };
  }

  const apigwClient = buildApiGwClient(domainName, stage);

  try {
    switch (event.requestContext.routeKey) {
      case "$connect": {
        return handleConnect(event, docClient);
      }

      case "$disconnect": {
        const connectionId = event.requestContext.connectionId;
        if (connectionId) {
          const getResult = await docClient.send(
            new GetCommand({
              TableName: CONNECTIONS_TABLE,
              Key: { connectionId },
            }),
          );
          const sessionId = getResult.Item?.sessionId as string | undefined;
          if (sessionId) {
            return await handleDisconnect(connectionId, sessionId, docClient);
          }
        }
        return { statusCode: 200 };
      }

      case "$default": {
        return handleDefault(event, docClient, apigwClient);
      }

      default:
        return { statusCode: 400 };
    }
  } catch (error) {
    logger.error({ error }, "Unhandled error");
    return { statusCode: 500 };
  }
}
