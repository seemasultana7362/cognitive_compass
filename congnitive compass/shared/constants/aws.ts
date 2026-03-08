const NOVA_PRO_MODEL_ID = 'amazon.nova-pro-v1:0';
const CLAUDE_SONNET_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
const TITAN_EMBED_MODEL_ID = 'amazon.titan-embed-text-v2:0';

const NEPTUNE_PORT = 8182;
const NEPTUNE_ENGINE_VERSION = '1.2.0.0';

const VECTOR_DIMENSIONS = 1536;

const LAMBDA_MEMORY_MB = 1024;
const LAMBDA_TIMEOUT_SECONDS = 30;
const LAMBDA_CONCURRENT_EXECUTIONS = 100;

const AWS_CONFIG = {
  REGION: 'us-east-1',
  ACCOUNT_ID: process.env['AWS_ACCOUNT_ID'] ?? '',
  BEDROCK: {
    MODELS: {
      NOVA_PRO: NOVA_PRO_MODEL_ID,
      CLAUDE_SONNET: CLAUDE_SONNET_MODEL_ID,
      TITAN_EMBED: TITAN_EMBED_MODEL_ID,
    },
    FEATURES: {
      MULTI_AGENT_COLLABORATION: true,
      AUTOMATED_REASONING: true,
    },
  },
  NEPTUNE: {
    CLUSTER_IDENTIFIER: 'cc-neptune-cluster',
    INSTANCE_CLASS: 'db.t3.medium',
    ENGINE_VERSION: NEPTUNE_ENGINE_VERSION,
    PORT: NEPTUNE_PORT,
  },
  OPENSEARCH: {
    COLLECTION_NAME: 'cc-knowledge',
    VECTOR_DIMENSIONS,
    ENGINE: 'OPENSEARCH_2_11',
  },
  TIMESTREAM: {
    DATABASE_NAME: 'cognitive-telemetry',
    TABLE_NAME: 'interaction-events',
  },
  LAMBDA: {
    RUNTIME: 'nodejs20.x',
    MEMORY_SIZE: LAMBDA_MEMORY_MB,
    TIMEOUT: LAMBDA_TIMEOUT_SECONDS,
    CONCURRENT_EXECUTIONS: LAMBDA_CONCURRENT_EXECUTIONS,
  },
  API_GATEWAY: {
    WEBSOCKET_ROUTE: '$default',
    HTTP_API_VERSION: '2.0',
  },
} as const;

function validateAwsConfig(): void {
  const requiredEnvVars = ['AWS_REGION', 'AWS_ACCOUNT_ID', 'BEDROCK_MODEL_ACCESS'];
  const missing: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required AWS environment variables: ${missing.join(', ')}. ` +
      'Please ensure all required variables are set in your environment.'
    );
  }
}

export {
  AWS_CONFIG,
  validateAwsConfig,
  NOVA_PRO_MODEL_ID,
  CLAUDE_SONNET_MODEL_ID,
  TITAN_EMBED_MODEL_ID,
  NEPTUNE_PORT,
  NEPTUNE_ENGINE_VERSION,
  VECTOR_DIMENSIONS,
  LAMBDA_MEMORY_MB,
  LAMBDA_TIMEOUT_SECONDS,
  LAMBDA_CONCURRENT_EXECUTIONS,
};
