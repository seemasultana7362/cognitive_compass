import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { z } from "zod";
import pino from "pino";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import {
  DataFlowGraph,
  DataNode,
  DataEdge,
  Result,
} from "@cognitive-compass/shared/types";

const NEPTUNE_ENDPOINT = process.env.NEPTUNE_ENDPOINT ?? "";
const NEPTUNE_PORT = 8182;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

const DiscoveryQuerySchema = z.object({
  filePath: z.string(),
  symbol: z.string(),
  depth: z.number().int().min(1).max(5),
});

const NeptuneNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
});

const NeptuneEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
});

const NeptuneResponseSchema = z.object({
  results: z
    .array(
      z.object({
        n: NeptuneNodeSchema.optional(),
        m: NeptuneNodeSchema.optional(),
        r: NeptuneEdgeSchema.optional(),
      }),
    )
    .optional(),
});

function buildNeptuneUrl(): string {
  return `http://${NEPTUNE_ENDPOINT}:${NEPTUNE_PORT}/openCypher`;
}

function buildTraversalQuery(symbol: string, depth: number): string {
  return `
MATCH (n {name: '${symbol}'})
OPTIONAL MATCH path = (n)-[r*1..${depth}]-(related)
WHERE related IS NOT NULL
WITH n, related, r
UNWIND r AS edge
UNWIND CASE WHEN edge IS NOT NULL THEN [edge] ELSE [] END AS rel
RETURN n, related, rel
LIMIT 100
`.trim();
}

async function executeQuery(
  query: string,
  logger: pino.Logger,
): Promise<Result<unknown, Error>> {
  const url = buildNeptuneUrl();
  const region = process.env.AWS_REGION ?? "us-east-1";
  const signer = new SignatureV4({
    service: "neptune-db",
    region,
    sha256: Sha256,
  });

  const body = JSON.stringify({ query });

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const request = new Request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Host": new URL(url).host,
        },
        body,
      });

      const signed = await signer.sign(request);

      const headers: Record<string, string> = {};
      signed.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Neptune query failed: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      return { success:    } catch (error) {
      if true, data };
 (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const delay = BASE_RETRY_DELAY_MS * BACKOFF_MULTIPLIER ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error({ error }, "Neptune query failed after retries");
        return { success: false, error: error as Error };
      }
    }
  }

  return { success: false, error: new Error("Max retries exceeded") };
}

function mapToDataFlowGraph(neptuneResponse: unknown): DataFlowGraph {
  const parsed = NeptuneResponseSchema.safeParse(neptuneResponse);

  if (!parsed.success || !parsed.data.results) {
    return { nodes: [], edges: [] };
  }

  const nodesMap = new Map<string, DataNode>();
  const edges: DataEdge[] = [];

  for (const row of parsed.data.results) {
    if (row.n) {
      const nodeData = row.n;
      const nodeId = nodeData.id || nodeData.label;
      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          label: nodeData.label,
          type: (nodeData.type as DataNode["type"]) || "function",
        });
      }
    }

    if (row.m) {
      const nodeData = row.m;
      const nodeId = nodeData.id || nodeData.label;
      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          label: nodeData.label,
          type: (nodeData.type as DataNode["type"]) || "function",
        });
      }
    }

    if (row.r) {
      const edge = row.r;
      edges.push({
        from: edge.from,
        to: edge.to,
        label: edge.label,
        type: "dependency",
      });
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<Result<DataFlowGraph, Error>> {
  const logger = pino({
    name: "discovery-agent",
    requestId: context.awsRequestId,
  });

  if (!event.body) {
    return { success: false, error: new Error("Missing request body") };
  }

  const parseResult = DiscoveryQuerySchema.safeParse(JSON.parse(event.body));

  if (!parseResult.success) {
    logger.error({ error: parseResult.error }, "Invalid query");
    return { success: false, error: new Error(parseResult.error.message) };
  }

  const { symbol, depth } = parseResult.data;
  const query = buildTraversalQuery(symbol, depth);

  logger.info({ symbol, depth, query }, "Executing Neptune query");

  const result = await executeQuery(query, logger);

  if (!result.success) {
    logger.error({ error: result.error }, "Neptune query failed");
    return { success: true, data: { nodes: [], edges: [] } };
  }

  const dataFlowGraph = mapToDataFlowGraph(result.data);

  logger.info(
    {
      nodeCount: dataFlowGraph.nodes.length,
      edgeCount: dataFlowGraph.edges.length,
    },
    "Query completed",
  );

  return { success: true, data: dataFlowGraph };
}
