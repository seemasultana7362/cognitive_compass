# Project Structure

## Repository Organization

This is a multi-component system with the following high-level structure:

```
cognitive-compass/
├── .kiro/                    # Kiro configuration and steering
├── client/                   # Client-side applications
│   ├── vscode-extension/     # VS Code extension (primary UI)
│   ├── browser-extension/    # Browser context tracking
│   └── web-dashboard/        # Analytics dashboard (React)
├── cloud/                    # AWS cloud infrastructure
│   ├── lambda/               # Lambda function handlers
│   │   ├── comprehension/    # Comprehension Agent
│   │   ├── cognitive/        # Cognitive State Agent
│   │   ├── discovery/        # Discovery Agent
│   │   ├── preservation/     # Knowledge Preservation Agent
│   │   └── validation/       # Validation Agent
│   ├── cdk/                  # AWS CDK infrastructure code
│   └── step-functions/       # Workflow definitions
├── shared/                   # Shared types and utilities
│   ├── types/                # TypeScript interfaces
│   └── utils/                # Common utilities
└── docs/                     # Documentation

```

## Key Components

### Client Layer
- VS Code Extension: Primary developer interface with telemetry collection
- Browser Extension: Context tracking for documentation visits
- Web Dashboard: Analytics and insights visualization

### Cloud Layer
- Lambda Functions: One per agent (5 total)
- Step Functions: Orchestration workflows
- CDK Stacks: Infrastructure as code

### Storage Layer
- Neptune: Code knowledge graph
- Timestream: Telemetry time-series data
- OpenSearch: Vector search for knowledge base
- DynamoDB: User profiles and agent states
- S3: Code snapshots and visualizations

## File Naming Conventions

- TypeScript files: `camelCase.ts`
- React components: `PascalCase.tsx`
- Lambda handlers: `index.ts` (entry point)
- CDK stacks: `PascalCaseStack.ts`
- Test files: `*.test.ts` or `*.spec.ts`

## Configuration Files

- `tsconfig.json`: TypeScript configuration
- `package.json`: Dependencies and scripts
- `cdk.json`: CDK app configuration
- `.env`: Environment variables (not committed)

## Documentation

- `README.md`: Project overview and setup
- `design.md`: System architecture and design
- `requirement.md`: Feature requirements and AWS services
- `SECURITY.md`: Security policy
