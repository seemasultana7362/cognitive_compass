import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigV4Signer } from "@opensearch-project/opensearch/aws";
import { BedrockClient } from "../../utils/bedrock-client";
import {
  ExplanationResponse,
  DataFlowGraph,
  CodeStep,
  Result,
} from "@cognitive-compass/shared/types";

const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT ?? "";
const INDEX_NAME = "cc-knowledge-index";
const TOP_K = 5;

interface KnowledgeDocument {
  id: string;
  explanation: string;
  keyConcepts: string[];
  embedding: number[];
  timestamp: number;
  filePath: string;
  language: string;
  dataFlow?: DataFlowGraph;
  codeWalkthrough?: CodeStep[];
}

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
  id: z.string(),
  timestamp: z.number(),
  explanation: z.string(),
  keyConcepts: z.array(z.string()),
  dataFlow: DataFlowGraphSchema,
  codeWalkthrough: z.array(CodeStepSchema),
  confidence: z.number(),
  reasoningTrace: z.string(),
  suggestedQuestions: z.array(z.string()),
  estimatedReadTime: z.number(),
});

const StorePayloadSchema = z.object({
  action: z.literal("store"),
  explanationResponse: ExplanationResponseSchema,
});

const RetrievePayloadSchema = z.object({
  action: z.literal("retrieve"),
  query: z.string(),
});

const KnowledgePayloadSchema = z.discriminatedUnion("action", [
  StorePayloadSchema,
  RetrievePayloadSchema,
]);

function buildOpenSearchClient(): Client {
  const region = process.env.AWS_REGION ?? "us-east-1";

  return new Client({
    node: OPENSEARCH_ENDPOINT,
    aws: AwsSigV4Signer({
      region,
      service: "aoss",
      credentials: fromEnv(),
    }),
  });
}

function fromEnv() {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

async function storeExplanation(
  explanationResponse: ExplanationResponse,
  client: Client,
): Promise<Result<string, Error>> {
  try {
    const bedrockClient = BedrockClient.getInstance();

    const embedResult = await bedrockClient.generateEmbedding(
      explanationResponse.explanation,
    );

    if (!embedResult.success) {
      return { success: false, error: embedResult.error };
    }

    const document: KnowledgeDocument = {
      id: explanationResponse.id,
      explanation: explanationResponse.explanation,
      keyConcepts: explanationResponse.keyConcepts,
      embedding: embedResult.data,
      timestamp: explanationResponse.timestamp,
      filePath: "",
      language: "",
      dataFlow: explanationResponse.dataFlow,
      codeWalkthrough: explanationResponse.codeWalkthrough,
    };

    const response = await client.index({
      index: INDEX_NAME,
      id: document.id,
      body: document,
    });

    return { success: true, data: document.id };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

const OpenSearchHitSchema = z.object({
  _source: z.record(z.unknown()).optional(),
});

async function retrieveExplanations(
  query: string,
  client: Client,
): Promise<Result<KnowledgeDocument[], Error>> {
  try {
    const bedrockClient = BedrockClient.getInstance();

    const embedResult = await bedrockClient.generateEmbedding(query);

    if (!embedResult.success) {
      return { success: false, error: embedResult.error };
    }

    const knnQuery = {
      query: {
        knn: {
          embedding: {
            vector: embedResult.data,
            k: TOP_K,
          },
        },
      },
    };

    const response = await client.search({
      index: INDEX_NAME,
      body: knnQuery,
    });

    const hitsRaw = response.body.hits.hits;
    const hitsParse = z.array(OpenSearchHitSchema).safeParse(hitsRaw);

    if (!hitsParse.success) {
      return {
        success: false,
        error: new Error("Invalid OpenSearch response"),
      };
    }

    const documents: KnowledgeDocument[] = [];

    for (const hit of hitsParse.data) {
      if (hit._source) {
        const doc: KnowledgeDocument = {
          id: (hit._source.id as string) ?? "",
          explanation: (hit._source.explanation as string) ?? "",
          keyConcepts: (hit._source.keyConcepts as string[]) ?? [],
          embedding: (hit._source.embedding as number[]) ?? [],
          timestamp: (hit._source.timestamp as number) ?? 0,
          filePath: (hit._source.filePath as string) ?? "",
          language: (hit._source.language as string) ?? "",
        };
        documents.push(doc);
      }
    }

    return { success: true, data: documents };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<Result<unknown, Error>> {
  const logger = pino({
    name: "knowledge-agent",
    requestId: context.awsRequestId,
  });

  if (!event.body) {
    return { success: false, error: new Error("Missing request body") };
  }

  const parseResult = KnowledgePayloadSchema.safeParse(JSON.parse(event.body));

  if (!parseResult.success) {
    logger.error({ error: parseResult.error }, "Invalid payload");
    return { success: false, error: new Error(parseResult.error.message) };
  }

  const client = buildOpenSearchClient();
  const payload = parseResult.data;

  if (payload.action === "store") {
    logger.info(
      { explanationId: payload.explanationResponse.id },
      "Storing explanation",
    );
    const result = await storeExplanation(payload.explanationResponse, client);

    if (!result.success) {
      logger.error({ error: result.error }, "Failed to store explanation");
      return result;
    }

    return { success: true, data: { id: result.data } };
  } else {
    logger.info({ query: payload.query }, "Retrieving explanations");
    const result = await retrieveExplanations(payload.query, client);

    if (!result.success) {
      logger.error({ error: result.error }, "Failed to retrieve explanations");
      return result;
    }

    return { success: true, data: result.data };
  }
}
