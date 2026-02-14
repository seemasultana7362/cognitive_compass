# Cognitive Compass - System Design Document

## System Overview

Cognitive Compass employs a multi-layered architecture with clear separation of concerns:
- **Client Layer**: Data collection and UI
- **Cloud Layer**: Orchestration and AI processing
- **Storage Layer**: Persistence and analytics

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  VS Code Extension  │  Browser Extension  │  Web Dashboard      │
│  (Primary UI)       │  (Context Tracking) │  (Analytics)        │
└──────────────┬──────────────────┬─────────────────┬─────────────┘
               │                  │                 │
               └──────────────────┼─────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   WebSocket/REST APIs     │
                    └─────────────┬─────────────┘
                                  │
┌─────────────────────────────────▼─────────────────────────────────┐
│                          CLOUD LAYER                               │
├───────────────────────────────────────────────────────────────────┤
│  API Gateway  │  AppSync  │  Lambda  │  Step Functions  │ Bedrock │
│  EventBridge  │  Multi-Agent Orchestration                        │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                        STORAGE LAYER                               │
├───────────────────────────────────────────────────────────────────┤
│  Neptune  │  Timestream  │  OpenSearch  │  DynamoDB  │  S3        │
└───────────────────────────────────────────────────────────────────┘
```

## Client Layer

### 1. VS Code Extension (Primary Interface)

**Technology Stack:**
- TypeScript
- VS Code Extension API
- React webviews
- Three.js for 3D visualization
- Socket.io client for real-time communication

**Components:**

#### Telemetry Collector
```typescript
interface TelemetryEvent {
  timestamp: number;
  userId: string;
  projectId: string;
  eventType: 'cursor' | 'file' | 'scroll' | 'click' | 'keystroke' | 'tab';
  data: {
    position?: { line: number; column: number };
    filePath?: string;
    scrollDepth?: number;
    clickTarget?: string;
    keystrokeDynamics?: KeystrokeMetrics;
  };
}
```

**Collection Intervals:**
- Cursor position: Every 100ms
- File events: On open, close, save, edit
- Scroll patterns: On scroll with debouncing
- Click behavior: On click with target identification
- Keystroke dynamics: Timing between keystrokes
- Tab switching: On active editor change

#### 3D Visualization Panel
- Embedded Three.js in webview
- Real-time code execution path rendering
- Interactive node exploration
- Zoom, pan, rotate controls

#### Real-time Communication
- WebSocket connection via Socket.io
- Bidirectional event streaming
- Automatic reconnection handling
- Message queuing for offline scenarios

**Extension Activation Events:**
```json
{
  "activationEvents": [
    "onStartupFinished",
    "onLanguage:javascript",
    "onLanguage:typescript",
    "onLanguage:python",
    "onCommand:cognitiveCompass.showVisualization"
  ]
}
```

### 2. Browser Extension (Context Tracking)

**Technology Stack:**
- Chrome Manifest V3
- TypeScript
- Chrome Storage API
- Chrome Tabs API

**Tracked Metrics:**
- Documentation visits (URL patterns)
- StackOverflow searches (query extraction)
- Time on page (active tab tracking)
- Scroll depth (percentage of page viewed)
- Copy-paste events from documentation

**Architecture:**
```
Background Service Worker
    ├── Tab Monitor
    ├── URL Pattern Matcher
    ├── Activity Tracker
    └── Data Sync Service
```

**Data Collection:**
```typescript
interface BrowserActivity {
  timestamp: number;
  userId: string;
  url: string;
  domain: string;
  timeOnPage: number;
  scrollDepth: number;
  searchQuery?: string;
  copiedContent?: string;
}
```

### 3. Web Dashboard (Analytics)

**Technology Stack:**
- React 18
- TypeScript
- Tailwind CSS
- Recharts (charts)
- D3.js (advanced visualizations)
- AWS Amplify (hosting)
- Amazon Cognito (authentication)

**Pages:**
1. **Overview Dashboard**: Key metrics, cognitive load trends
2. **Code Insights**: Dependency graphs, complexity metrics
3. **Learning Analytics**: Knowledge gaps, quiz results
4. **Team Analytics**: Collaboration patterns, knowledge sharing

**Component Structure:**
```
src/
├── components/
│   ├── charts/
│   │   ├── CognitiveLoadChart.tsx
│   │   ├── DependencyGraph.tsx
│   │   └── LearningProgressChart.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Dashboard.tsx
│   └── widgets/
│       ├── MetricCard.tsx
│       └── AlertPanel.tsx
├── pages/
│   ├── Overview.tsx
│   ├── CodeInsights.tsx
│   └── Analytics.tsx
└── services/
    ├── api.ts
    └── auth.ts
```

## Cloud Layer

### API Gateway & Orchestration

#### Amazon API Gateway
**REST API Endpoints:**
```
POST   /telemetry/events          - Batch telemetry ingestion
GET    /insights/{userId}          - User insights
POST   /explanations/generate      - Request code explanation
GET    /knowledge/{query}          - Knowledge base search
POST   /validation/quiz            - Submit quiz response
```

**WebSocket API:**
```
$connect                           - Client connection
$disconnect                        - Client disconnection
$default                           - Default route
telemetry                          - Real-time telemetry stream
notification                       - Agent notifications
```

#### AWS AppSync (GraphQL)
```graphql
type Query {
  getCodeGraph(projectId: ID!): CodeGraph
  getCognitiveState(userId: ID!): CognitiveState
  getKnowledgeBase(query: String!): [KnowledgeEntry]
  getUserInsights(userId: ID!, timeRange: TimeRange!): UserInsights
}

type Mutation {
  submitTelemetry(events: [TelemetryEvent!]!): BatchResult
  saveExplanation(explanation: ExplanationInput!): Explanation
  updateLearningPath(userId: ID!, path: LearningPathInput!): LearningPath
}

type Subscription {
  onCognitiveAlert(userId: ID!): CognitiveAlert
  onNewExplanation(projectId: ID!): Explanation
}
```

#### AWS Lambda Functions
**Runtime:** Node.js 20.x

**Function Handlers:**
```
comprehension-handler/          - Code analysis and explanation
├── index.ts
├── analyzer.ts
└── visualizer.ts

cognitive-handler/              - Cognitive state monitoring
├── index.ts
├── pattern-detector.ts
└── predictor.ts

discovery-handler/              - Knowledge graph operations
├── index.ts
├── graph-builder.ts
└── query-processor.ts

preservation-handler/           - Knowledge capture
├── index.ts
├── indexer.ts
└── retriever.ts

validation-handler/             - Understanding validation
├── index.ts
├── quiz-generator.ts
└── gap-analyzer.ts
```

**Lambda Configuration:**
- Memory: 1024 MB (adjustable per function)
- Timeout: 30 seconds (API calls), 5 minutes (async processing)
- Concurrency: Reserved concurrency per agent
- Environment variables: AWS service endpoints, model IDs

### Multi-Agent Orchestration

#### Amazon Bedrock Multi-Agent Collaboration

**Agent Definitions:**
```typescript
interface AgentConfig {
  agentId: string;
  name: string;
  modelId: string;
  instructions: string;
  actionGroups: ActionGroup[];
  knowledgeBases: string[];
}

const agents = {
  comprehension: {
    modelId: 'amazon.nova-pro-v1:0',
    actionGroups: ['code-analysis', 'visualization-generation']
  },
  cognitive: {
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    actionGroups: ['pattern-detection', 'prediction']
  },
  discovery: {
    modelId: 'amazon.nova-lite-v1:0',
    actionGroups: ['graph-query', 'search']
  },
  preservation: {
    modelId: 'amazon.titan-embed-text-v2:0',
    actionGroups: ['indexing', 'retrieval']
  },
  validation: {
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    actionGroups: ['quiz-generation', 'assessment']
  }
};
```

**Collaboration Patterns:**
1. **Sequential**: Comprehension → Cognitive → Validation
2. **Parallel**: Discovery + Preservation (concurrent execution)
3. **Conditional**: Cognitive triggers Comprehension on confusion detection

#### AWS Step Functions Express Workflows

**State Machine: Code Explanation Flow**
```json
{
  "StartAt": "AnalyzeCode",
  "States": {
    "AnalyzeCode": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:comprehension-handler",
      "Next": "CheckCognitiveState"
    },
    "CheckCognitiveState": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:cognitive-handler",
      "Next": "AdaptExplanation"
    },
    "AdaptExplanation": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.cognitiveLoad",
          "StringEquals": "high",
          "Next": "SimplifyExplanation"
        }
      ],
      "Default": "GenerateVisualization"
    },
    "SimplifyExplanation": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:comprehension-handler",
      "Parameters": {
        "level": "beginner"
      },
      "Next": "GenerateVisualization"
    },
    "GenerateVisualization": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:comprehension-handler",
      "Next": "SaveKnowledge"
    },
    "SaveKnowledge": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:preservation-handler",
      "End": true
    }
  }
}
```

#### Amazon EventBridge

**Event Bus: cognitive-compass-events**

**Event Patterns:**
```json
{
  "source": ["cognitive.agent"],
  "detail-type": ["Confusion Detected"],
  "detail": {
    "severity": ["high", "critical"]
  }
}
```

**Rules:**
- `confusion-alert`: Triggers comprehension agent
- `knowledge-update`: Triggers preservation agent
- `validation-required`: Triggers validation agent

## Storage Layer

### 1. Amazon Neptune (Graph Database)

**Graph Schema:**

**Nodes:**
```
Function {
  id: string
  name: string
  filePath: string
  lineStart: number
  lineEnd: number
  complexity: number
  lastModified: timestamp
}

Class {
  id: string
  name: string
  filePath: string
  type: 'class' | 'interface' | 'abstract'
}

File {
  id: string
  path: string
  language: string
  linesOfCode: number
}

Module {
  id: string
  name: string
  version: string
}
```

**Edges:**
```
CALLS {
  from: Function
  to: Function
  frequency: number
}

IMPORTS {
  from: File
  to: Module
}

EXTENDS {
  from: Class
  to: Class
}

IMPLEMENTS {
  from: Class
  to: Class
}

CONTAINS {
  from: File
  to: Function | Class
}
```

**Gremlin Queries:**
```groovy
// Find all dependencies of a function
g.V().has('Function', 'name', 'authenticate')
  .out('CALLS')
  .path()
  .by(valueMap())

// Find circular dependencies
g.V().has('File', 'path', startPath)
  .repeat(out('IMPORTS'))
  .until(has('path', startPath))
  .path()
```

### 2. Amazon Timestream (Time-Series Database)

**Database:** cognitive_compass

**Tables:**

#### cognitive_telemetry
```sql
CREATE TABLE cognitive_telemetry (
  time TIMESTAMP,
  user_id VARCHAR,
  project_id VARCHAR,
  file_path VARCHAR,
  event_type VARCHAR,
  cognitive_load DOUBLE,
  confusion_score DOUBLE,
  interaction_speed DOUBLE
)
```

**Dimensions:** user_id, project_id, file_path, event_type
**Measures:** cognitive_load, confusion_score, interaction_speed

#### interaction_events
```sql
CREATE TABLE interaction_events (
  time TIMESTAMP,
  user_id VARCHAR,
  event_type VARCHAR,
  duration_ms BIGINT,
  success BOOLEAN
)
```

**Retention Policy:**
- Hot storage: 1 year (in-memory)
- Cold storage: 5 years (magnetic)

**Query Examples:**
```sql
-- Average cognitive load over time
SELECT BIN(time, 5m) as time_bucket,
       AVG(cognitive_load) as avg_load
FROM cognitive_telemetry
WHERE user_id = 'user123'
  AND time > ago(24h)
GROUP BY BIN(time, 5m)
ORDER BY time_bucket DESC

-- Confusion spike detection
SELECT time, file_path, confusion_score
FROM cognitive_telemetry
WHERE confusion_score > 0.7
  AND time > ago(1h)
```

### 3. Amazon OpenSearch Serverless

**Collections:**

#### knowledge_base
```json
{
  "mappings": {
    "properties": {
      "explanation_id": { "type": "keyword" },
      "content": { "type": "text" },
      "code_snippet": { "type": "text" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1024
      },
      "user_id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

#### explanations_index
```json
{
  "mappings": {
    "properties": {
      "explanation_text": { "type": "text" },
      "code_context": { "type": "text" },
      "difficulty_level": { "type": "keyword" },
      "language": { "type": "keyword" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1024
      }
    }
  }
}
```

**Vector Search:**
```json
{
  "query": {
    "knn": {
      "embedding": {
        "vector": [0.1, 0.2, ...],
        "k": 10
      }
    }
  }
}
```

### 4. Amazon DynamoDB

**Tables:**

#### user_profiles
```
Partition Key: user_id (String)
Attributes:
  - name: String
  - email: String
  - expertise_level: String
  - learning_style: String
  - preferences: Map
  - created_at: Number
```

#### agent_states
```
Partition Key: agent_id (String)
Sort Key: timestamp (Number)
Attributes:
  - state: Map
  - context: Map
  - last_action: String
  - ttl: Number (24 hours)
```

#### project_metadata
```
Partition Key: project_id (String)
Attributes:
  - name: String
  - language: String
  - framework: String
  - team_members: List
  - created_at: Number
```

### 5. Amazon S3

**Buckets:**

#### cognitive-compass-code-snapshots
```
Structure:
/{project_id}/{timestamp}/
  ├── source/
  ├── dependencies/
  └── metadata.json
```

#### cognitive-compass-visualizations
```
Structure:
/{user_id}/{session_id}/
  ├── graph.json
  ├── execution_path.json
  └── thumbnail.png
```

#### cognitive-compass-exports
```
Structure:
/{user_id}/exports/
  ├── knowledge_base_{date}.json
  └── analytics_{date}.csv
```

## Data Flow

### 1. Telemetry Ingestion Flow
```
VS Code Extension
    → WebSocket (Socket.io)
    → API Gateway WebSocket
    → Lambda (telemetry-ingestion)
    → Kinesis Data Stream
    → Lambda (stream-processor)
    → Timestream + DynamoDB
```

### 2. Code Explanation Flow
```
User Request
    → API Gateway REST
    → Step Functions
    → Comprehension Agent (Bedrock)
    → Neptune (code graph query)
    → Cognitive Agent (user state)
    → Explanation Generation
    → OpenSearch (indexing)
    → Response to Client
```

### 3. Confusion Detection Flow
```
Telemetry Stream
    → Cognitive Agent (real-time analysis)
    → Confusion Detected
    → EventBridge Event
    → Comprehension Agent Triggered
    → Proactive Explanation
    → WebSocket Push to Client
```

## Security Architecture

### Authentication & Authorization
- Amazon Cognito User Pools
- JWT tokens for API authentication
- IAM roles for service-to-service communication

### Data Encryption
- At rest: AWS KMS encryption
- In transit: TLS 1.3
- Client-side encryption for sensitive telemetry

### Network Security
- VPC for Lambda functions
- Security groups for Neptune and OpenSearch
- API Gateway throttling and WAF rules

## Monitoring & Observability

### CloudWatch Metrics
- Lambda invocation counts and errors
- API Gateway latency and 4xx/5xx errors
- WebSocket connection counts
- Agent response times

### X-Ray Tracing
- End-to-end request tracing
- Service map visualization
- Performance bottleneck identification

### CloudWatch Logs
- Structured logging with JSON format
- Log aggregation per agent
- Anomaly detection with Logs Insights

## Scalability Considerations

### Auto-scaling
- Lambda: Automatic scaling with reserved concurrency
- DynamoDB: On-demand capacity mode
- OpenSearch: Auto-scaling for compute and storage

### Caching
- API Gateway caching for frequent queries
- CloudFront for dashboard assets
- DynamoDB DAX for hot data

### Performance Optimization
- Batch telemetry ingestion
- Async processing with SQS queues
- Connection pooling for Neptune
- Vector index optimization in OpenSearch

## Deployment Strategy

### Infrastructure as Code
- AWS CDK (TypeScript)
- Separate stacks per layer
- Environment-specific configurations

### CI/CD Pipeline
```
GitHub → GitHub Actions
    ├── Build & Test
    ├── CDK Synth
    ├── Deploy to Dev
    ├── Integration Tests
    ├── Deploy to Staging
    ├── E2E Tests
    └── Deploy to Production
```

### Rollback Strategy
- Blue/Green deployment for Lambda
- Canary releases for API changes
- Database migration versioning

## Cost Optimization

### Resource Tagging
- Environment tags (dev, staging, prod)
- Cost center allocation
- Resource lifecycle management

### Cost Controls
- Lambda memory optimization
- Timestream data retention policies
- S3 lifecycle policies for old snapshots
- OpenSearch index lifecycle management

## Disaster Recovery

### Backup Strategy
- Neptune: Automated daily snapshots
- DynamoDB: Point-in-time recovery enabled
- S3: Cross-region replication for critical data

### RTO/RPO Targets
- RTO: 4 hours
- RPO: 1 hour
- Multi-AZ deployment for high availability
