# Technology Stack

## Frontend

- React 18 + TypeScript
- Tailwind CSS for styling
- Three.js for 3D visualizations
- Recharts and D3.js for charts
- VS Code Extension API

## Backend

- Node.js 20.x runtime
- AWS Lambda for serverless compute
- GraphQL via AWS AppSync
- REST APIs via API Gateway
- WebSocket for real-time communication (Socket.io)

## AI/ML Layer

- Amazon Bedrock (Nova Pro, Claude 3, Titan)
- Bedrock Multi-Agent Collaboration
- Bedrock Automated Reasoning
- Amazon SageMaker for custom models
- Amazon Lex for conversational AI

## Data & Storage

- Amazon Neptune (graph database)
- Amazon Timestream (time-series)
- Amazon OpenSearch Serverless (vector search)
- Amazon DynamoDB (NoSQL)
- Amazon S3 (object storage)

## Infrastructure

- AWS CDK (TypeScript) for IaC
- AWS Step Functions for orchestration
- Amazon EventBridge for event streaming
- AWS Kinesis for real-time data
- AWS Amplify for hosting
- Amazon Cognito for auth

## Development Tools

- TypeScript for type safety
- GitHub Actions for CI/CD
- AWS X-Ray for tracing
- CloudWatch for monitoring

## Common Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Deploy infrastructure (CDK)
cdk deploy

# Synthesize CloudFormation
cdk synth

# Run linter
npm run lint

# Format code
npm run format
```

## Architecture Patterns

- Multi-agent collaboration
- Event-driven architecture
- Serverless-first approach
- Graph-based code modeling
- Vector embeddings for semantic search
- Time-series analytics for telemetry
