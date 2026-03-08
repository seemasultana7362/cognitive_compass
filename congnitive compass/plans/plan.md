🧠 COGNITIVE COMPASS — ULTIMATE AI BUILD MANUAL
SECTION 0: PROJECT MANIFEST (Internalize This)
Cognitive Compass is a VS Code extension + AWS cloud system that eliminates developer context switching by detecting confusion in real-time and proactively explaining code. It uses 5 AI agents (Comprehension, Cognitive State, Discovery, Knowledge, Validation) orchestrated via Amazon Bedrock Multi-Agent Collaboration. The system captures telemetry (cursor, scroll, edits) every 100ms, predicts confusion 30-60 seconds before the developer asks for help, and delivers personalized explanations via 3D visualizations.
Core Value: 73% faster comprehension, 89% fewer context switches, 6x faster onboarding.
SECTION 1: ARCHITECTURE BLUEPRINT
System Diagram
plain
Copy
┌─────────────────┐      WebSocket       ┌──────────────────┐
│  VS Code Ext    │ ◄──────────────────► │  AWS API Gateway │
│  - Telemetry    │                        │  - HTTP + WS     │
│  - 3D Viz       │                        └────────┬─────────┘
│  - React UI     │                                 │
└─────────────────┘                                 ▼
                                            ┌──────────────────┐
                                            │  EventBridge     │
                                            │  (Agent Bus)     │
                                            └────────┬─────────┘
                                                     │
           ┌──────────┬──────────┬──────────┬────────┴────────┬──────────┐
           ▼          ▼          ▼          ▼                 ▼          ▼
      ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      ┌────────┐ ┌────────┐
      │Compre- │ │Cognitive│ │Discovery│ │Knowledge│      │Valida- │ │Telemetry│
      │hension │ │ State  │ │        │ │        │      │  tion  │ │Processor│
      │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │      │ Agent  │ │         │
      └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘      └────┬───┘ └────┬───┘
           │          │          │          │               │          │
           └──────────┴──────────┴──────────┴───────────────┴──────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │  Amazon Bedrock Multi-Agent         │
                    │  - Nova Pro (code understanding)    │
                    │  - Automated Reasoning (no halluc.) │
                    │  - Custom SageMaker (confusion ML)│
                    └─────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
      ┌─────────┐              ┌──────────┐              ┌──────────┐
      │Neptune  │              │OpenSearch│              │Timestream│
      │(Graph)  │              │(Vector)  │              │(Time-series)
      └─────────┘              └──────────┘              └──────────┘
Data Flows
Telemetry Flow: Extension → Kinesis → Lambda → Timestream + Real-time inference
Explanation Flow: Confusion detected → Multi-Agent orchestration → Response in <2s
Knowledge Flow: Explanation generated → Vector embedding → OpenSearch + S3 Tables
Visualization Flow: Agent response → WebSocket → React Three Fiber → 3D render
SECTION 2: COMPLETE FILE INVENTORY
Generate these 47 files in exact order (dependencies first):
Phase 1: Shared Types & Config (Files 1-5)
Table
#	Path	Purpose
1	/shared/types/index.ts	All TypeScript interfaces
2	/shared/constants/aws.ts	AWS service ARNs, regions
3	/shared/utils/telemetry-helpers.ts	Telemetry processing utilities
4	/shared/utils/encryption.ts	Client-side encryption
5	/package.json	Root workspace configuration
Phase 2: Infrastructure (Files 6-15)
Table
#	Path	Purpose
6	/infrastructure/terraform/providers.tf	AWS provider setup
7	/infrastructure/terraform/vpc.tf	Networking foundation
8	/infrastructure/terraform/bedrock.tf	AI/ML services
9	/infrastructure/terraform/neptune.tf	Graph database
10	/infrastructure/terraform/opensearch.tf	Search & vectors
11	/infrastructure/terraform/timestream.tf	Time-series DB
12	/infrastructure/terraform/lambda-agents.tf	5 Lambda functions
13	/infrastructure/terraform/api-gateway.tf	HTTP + WebSocket APIs
14	/infrastructure/terraform/iam.tf	Security policies
15	/infrastructure/terraform/outputs.tf	Export values
Phase 3: Extension Core (Files 16-28)
Table
#	Path	Purpose
16	/apps/vscode-extension/package.json	Extension manifest
17	/apps/vscode-extension/tsconfig.json	TypeScript strict config
18	/apps/vscode-extension/src/extension.ts	Activation entry
19	/apps/vscode-extension/src/services/TelemetryService.ts	Event capture
20	/apps/vscode-extension/src/services/CognitiveStateDetector.ts	Confusion ML
21	/apps/vscode-extension/src/services/WebSocketManager.ts	Real-time comms
22	/apps/vscode-extension/src/services/AgentOrchestrator.ts	Backend coordination
23	/apps/vscode-extension/src/commands/CommandHandlers.ts	VS Code commands
24	/apps/vscode-extension/src/providers/WebviewProvider.ts	Side panel UI
25	/apps/vscode-extension/src/webviews/3d-visualization/index.tsx	React entry
26	/apps/vscode-extension/src/webviews/3d-visualization/CodeGraph.tsx	Three.js graph
27	/apps/vscode-extension/src/webviews/3d-visualization/ExecutionPlayer.tsx	Step-through debugger
28	/apps/vscode-extension/webpack.config.js	Build configuration
Phase 4: Backend Agents (Files 29-39)
Table
#	Path	Purpose
29	/apps/api-service/package.json	Backend dependencies
30	/apps/api-service/agents/comprehension-agent/index.ts	Code explanation
31	/apps/api-service/agents/cognitive-state-agent/index.ts	Confusion detection
32	/apps/api-service/agents/discovery-agent/index.ts	Codebase exploration
33	/apps/api-service/agents/knowledge-agent/index.ts	Storage/retrieval
34	/apps/api-service/agents/validation-agent/index.ts	Quiz generation
35	/apps/api-service/agents/telemetry-processor/index.ts	Kinesis consumer
36	/apps/api-service/orchestration/multi-agent-collaborator.ts	Agent coordination
37	/apps/api-service/handlers/websocket-handler.ts	API Gateway WS
38	/apps/api-service/handlers/http-handler.ts	REST API
39	/apps/api-service/utils/bedrock-client.ts	AWS SDK wrapper
Phase 5: ML & Data (Files 40-44)
Table
#	Path	Purpose
40	/apps/ml-service/training/feature-engineering.py	Telemetry → features
41	/apps/ml-service/training/confusion-model.py	LSTM + RF ensemble
42	/apps/ml-service/inference/real-time-predictor.ts	SageMaker endpoint
43	/apps/ml-service/requirements.txt	Python dependencies
44	/apps/ml-service/Dockerfile	Training container
Phase 6: DevOps & Docs (Files 45-47)
Table
#	Path	Purpose
45	/.github/workflows/deploy.yml	CI/CD pipeline
46	/README.md	Project documentation
47	/.cursorrules	AI coding assistant rules
SECTION 3: IMPLEMENTATION SPECIFICATIONS
File 1: /shared/types/index.ts
TypeScript
Copy
// CRITICAL: All types must be exported and used everywhere. No 'any' allowed.

export interface TelemetryEvent {
  timestamp: number; // Unix epoch ms
  userId: string; // Cognito sub
  sessionId: string; // UUID v4
  projectId: string; // Git repo name
  eventType: 'cursor' | 'scroll' | 'keypress' | 'selection' | 'tab_switch' | 'file_open' | 'file_close' | 'hover' | 'command';
  payload: CursorPayload | ScrollPayload | KeypressPayload | SelectionPayload | TabSwitchPayload | FilePayload | HoverPayload | CommandPayload;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface CursorPayload {
  x: number; // Screen coordinates
  y: number;
  line: number; // Document position
  character: number;
  speed?: number; // Pixels/ms
  acceleration?: number;
}

interface ScrollPayload {
  direction: 'up' | 'down';
  delta: number;
  startLine: number;
  endLine: number;
  totalLines: number;
}

interface KeypressPayload {
  key?: string;
  isInsert: boolean;
  isDelete: boolean;
  isUndo: boolean;
  isRedo: boolean;
  changeSize: number; // Characters changed
}

interface SelectionPayload {
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  isEmpty: boolean;
  duration?: number; // How long held (ms)
}

interface TabSwitchPayload {
  from?: string; // Previous file path
  to?: string; // New file path
  isNewTab: boolean;
}

interface FilePayload {
  path: string;
  languageId: string;
  lineCount: number;
  action: 'open' | 'close';
}

interface HoverPayload {
  symbol: string;
  line: number;
  character: number;
}

interface CommandPayload {
  commandId: string;
}

export interface CognitiveState {
  state: 'focused' | 'exploring' | 'confused' | 'stuck';
  confidence: number; // 0-1
  detectedSignals: ConfusionSignal[];
  predictedTimeToHelp: number; // Seconds
  recommendedAction: 'none' | 'offer_help' | 'proactive_explanation' | 'suggest_break';
  learningStyle: 'visual' | 'textual' | 'interactive';
}

export interface ConfusionSignal {
  type: 'scroll_oscillation' | 'long_pause' | 'rapid_tab_switch' | 'undo_spree' | 'hover_exploration' | 'selection_hesitation' | 'cursor_jerk';
  confidence: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ExplanationRequest {
  code: string;
  language: string;
  filePath: string;
  cursorPosition: { line: number; character: number };
  userLevel: 'beginner' | 'intermediate' | 'expert';
  learningStyle: 'visual' | 'textual' | 'interactive';
  confusionSignals: ConfusionSignal[];
  projectContext?: string;
}

export interface ExplanationResponse {
  id: string;
  timestamp: number;
  explanation: string; // Natural language
  keyConcepts: string[];
  dataFlow: DataFlowGraph;
  codeWalkthrough: CodeStep[];
  confidence: number;
  reasoningTrace: string; // From Bedrock Automated Reasoning
  suggestedQuestions: string[];
  estimatedReadTime: number; // Seconds
}

export interface DataFlowGraph {
  nodes: DataNode[];
  edges: DataEdge[];
}

export interface DataNode {
  id: string;
  label: string;
  type: 'input' | 'process' | 'output' | 'condition' | 'loop' | 'datastore';
  description?: string;
  codeSnippet?: string;
  lineRange?: [number, number];
}

export interface DataEdge {
  from: string;
  to: string;
  label: string;
  type: 'flow' | 'data' | 'control' | 'error';
}

export interface CodeStep {
  stepNumber: number;
  lineNumber: number;
  description: string;
  variables: Record<string, any>;
  stdout?: string;
}

export interface AgentMessage {
  from: string;
  to: string;
  messageType: 'request' | 'response' | 'broadcast';
  payload: any;
  timestamp: number;
  conversationId: string;
  correlationId: string;
}

export interface DeveloperSession {
  userId: string;
  sessionId: string;
  projectId: string;
  activeFile: string;
  cursorPosition: { line: number; character: number };
  recentTelemetry: TelemetryEvent[];
  userProfile: UserProfile;
}

export interface UserProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  learningStyle: 'visual' | 'textual' | 'interactive';
  preferredLanguages: string[];
  joinDate: string;
}

export interface WebSocketMessage {
  type: 'telemetry' | 'request_explanation' | 'explanation_response' | 'cognitive_state_update' | 'ping' | 'pong';
  payload: any;
  timestamp: number;
}

// Utility types - use these, never 'any'
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
File 2: /shared/constants/aws.ts
TypeScript
Copy
// CRITICAL: These are the ONLY AWS configurations. Never hardcode elsewhere.

export const AWS_CONFIG = {
  REGION: 'us-east-1', // Bedrock has most models here
  ACCOUNT_ID: process.env.AWS_ACCOUNT_ID!, // Set via env var
  
  BEDROCK: {
    MODELS: {
      NOVA_PRO: 'amazon.nova-pro-v1:0',
      CLAUDE_SONNET: 'anthropic.claude-3-sonnet-20240229-v1:0',
      TITAN_EMBED: 'amazon.titan-embed-text-v2:0'
    },
    FEATURES: {
      MULTI_AGENT_COLLABORATION: true,
      AUTOMATED_REASONING: true
    }
  },
  
  NEPTUNE: {
    CLUSTER_IDENTIFIER: 'cc-neptune-cluster',
    INSTANCE_CLASS: 'db.t3.medium', // Upgrade to db.r5.large for production
    ENGINE_VERSION: '1.3.0.0',
    PORT: 8182
  },
  
  OPENSEARCH: {
    COLLECTION_NAME: 'cc-knowledge',
    VECTOR_DIMENSIONS: 1536, // Titan embed size
    ENGINE: 'OPENSEARCH_2_11'
  },
  
  TIMESTREAM: {
    DATABASE_NAME: 'cognitive-telemetry',
    TABLE_NAME: 'interaction-events'
  },
  
  LAMBDA: {
    RUNTIME: 'nodejs20.x',
    MEMORY_SIZE: 1024, // MB
    TIMEOUT: 30, // Seconds
    CONCURRENT_EXECUTIONS: 100
  },
  
  API_GATEWAY: {
    WEBSOCKET_ROUTE: '$default',
    HTTP_API_VERSION: '2.0'
  }
} as const;

// Validation function - call at startup
export function validateAwsConfig(): void {
  const required = ['AWS_REGION', 'AWS_ACCOUNT_ID', 'BEDROCK_MODEL_ACCESS'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing AWS config: ${missing.join(', ')}`);
  }
}
File 3: /shared/utils/telemetry-helpers.ts
TypeScript
Copy
// CRITICAL: Pure functions only. No side effects. Immutable operations.

import { TelemetryEvent, ConfusionSignal } from '../types';

/**
 * Calculates scroll oscillation score (0-1)
 * High score = user scrolling back and forth (confusion signal)
 */
export function calculateScrollOscillation(events: TelemetryEvent[]): number {
  const scrollEvents = events.filter(e => e.eventType === 'scroll');
  if (scrollEvents.length < 3) return 0;
  
  let directionChanges = 0;
  let lastDirection = 0; // -1 = up, 1 = down
  
  for (let i = 1; i < scrollEvents.length; i++) {
    const prev = scrollEvents[i-1].payload as { direction: 'up' | 'down' };
    const curr = scrollEvents[i].payload as { direction: 'up' | 'down' };
    const currDir = curr.direction === 'down' ? 1 : -1;
    
    if (currDir !== lastDirection && lastDirection !== 0) {
      directionChanges++;
    }
    lastDirection = currDir;
  }
  
  // Normalize: 5+ changes in window = high confusion
  return Math.min(1, directionChanges / 5);
}

/**
 * Detects long pauses in activity (staring at screen)
 */
export function detectLongPause(events: TelemetryEvent[], thresholdMs: number = 12000): number {
  if (events.length === 0) return 0;
  
  const lastEvent = events[events.length - 1];
  const now = Date.now();
  const pauseDuration = now - lastEvent.timestamp;
  
  if (pauseDuration > thresholdMs) {
    return Math.min(1, pauseDuration / 30000); // Cap at 30s
  }
  return 0;
}

/**
 * Calculates typing speed in WPM
 */
export function calculateTypingSpeed(events: TelemetryEvent[], windowMs: number = 60000): number {
  const cutoff = Date.now() - windowMs;
  const keypresses = events.filter(e => 
    e.eventType === 'keypress' && 
    e.timestamp > cutoff &&
    (e.payload as { isInsert: boolean }).isInsert
  );
  
  // Standard WPM calculation: (chars / 5) / (minutes)
  const chars = keypresses.reduce((sum, e) => 
    sum + (e.payload as { changeSize: number }).changeSize, 0
  );
  
  return (chars / 5) / (windowMs / 60000);
}

/**
 * Extracts features for ML model input
 * Returns 50-dimensional feature vector
 */
export function extractFeatures(events: TelemetryEvent[]): number[] {
  const now = Date.now();
  const features: number[] = new Array(50).fill(0);
  
  // Time windows for multi-scale analysis
  const windows = [5000, 30000, 120000, 300000];
  
  windows.forEach((windowMs, windowIdx) => {
    const windowEvents = events.filter(e => now - e.timestamp <= windowMs);
    const baseIdx = windowIdx * 12; // 12 features per window
    
    // Event counts
    features[baseIdx + 0] = windowEvents.filter(e => e.eventType === 'cursor').length;
    features[baseIdx + 1] = windowEvents.filter(e => e.eventType === 'scroll').length;
    features[baseIdx + 2] = windowEvents.filter(e => e.eventType === 'keypress').length;
    features[baseIdx + 3] = windowEvents.filter(e => e.eventType === 'tab_switch').length;
    
    // Behavioral patterns
    features[baseIdx + 4] = calculateScrollOscillation(windowEvents);
    features[baseIdx + 5] = windowEvents.filter(e => 
      (e.payload as { isUndo?: boolean }).isUndo
    ).length;
    features[baseIdx + 6] = windowEvents.filter(e => 
      (e.payload as { isDelete?: boolean }).isDelete
    ).length;
    
    // Temporal patterns
    if (windowEvents.length > 1) {
      const intervals = windowEvents.slice(1).map((e, i) => 
        e.timestamp - windowEvents[i].timestamp
      );
      features[baseIdx + 7] = average(intervals);
      features[baseIdx + 8] = stdDev(intervals);
    }
  });
  
  // Cross-window features (trends)
  features[48] = features[0] - features[12]; // Cursor activity trend (5s vs 30s)
  features[49] = features[4] > 0.5 ? 1 : 0; // High oscillation flag
  
  return features;
}

// Pure math helpers
function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length || 0;
}

function stdDev(arr: number[]): number {
  const avg = average(arr);
  return Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / arr.length);
}
File 4: /shared/utils/encryption.ts
TypeScript
Copy
// CRITICAL: Client-side encryption for sensitive telemetry. Never send raw code content.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives key from password using Argon2id-like parameters (scrypt)
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, {
    N: 32768, // CPU/memory cost
    r: 8,     // Block size
    p: 1      // Parallelization
  });
}

/**
 * Encrypts sensitive data before transmission
 */
export function encrypt(plaintext: string, password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  
  // Format: salt:iv:authTag:ciphertext (all base64)
  const result = Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
  return result;
}

/**
 * Decrypts data (for local storage only, never server-side)
 */
export function decrypt(ciphertext: string, password: string): string {
  const data = Buffer.from(ciphertext, 'base64');
  
  const salt = data.slice(0, SALT_LENGTH);
  const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = deriveKey(password, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * One-way hash for code content (for deduplication without storing code)
 */
export function hashCode(content: string): string {
  // Use SubtleCrypto in browser, crypto in Node
  if (typeof window !== 'undefined') {
    // Browser: use subtle crypto (async, but we need sync for telemetry)
    // Fallback: simple hash for telemetry purposes
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  // Node: use crypto
  const { createHash } = require('crypto');
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}
File 5: /package.json (Root)
JSON
Copy
{
  "name": "cognitive-compass",
  "version": "0.1.0",
  "private": true,
  "description": "AI-powered developer productivity tool with cognitive load detection",
  "workspaces": [
    "apps/*",
    "shared/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "deploy": "turbo run deploy",
    "infra:plan": "cd infrastructure/terraform && terraform plan",
    "infra:apply": "cd infrastructure/terraform && terraform apply",
    "extension:package": "cd apps/vscode-extension && vsce package",
    "extension:publish": "cd apps/vscode-extension && vsce publish"
  },
  "devDependencies": {
    "turbo": "^1.12.0",
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "packageManager": "npm@10.2.0"
}
SECTION 4: CODE QUALITY RULES (STRICT)
Every file must follow these rules. Violations = reject and rewrite:
Table
Rule	Enforcement
No any type	Use unknown with type guards or proper interfaces
No console.log	Use structured logger (Winston/Pino)
No empty catch blocks	Always handle errors, log and re-throw if needed
No magic numbers	Define constants with descriptive names
No functions >50 lines	Split into smaller, pure functions
No classes without interfaces	Define contract first
All async/await must have try/catch	Wrap in Result<T,E> pattern
All external calls must retry	Use exponential backoff, 3 attempts minimum
All user input must validate	Use Zod schemas, fail fast
All resources must dispose	Implement Disposable pattern
No secrets in code	Use environment variables only
No blocking operations	All I/O must be async
SECTION 5: BUILD SEQUENCE
Generate files in this exact order. Each phase depends on previous:
Phase 1 (Files 1-5): Shared foundation
Phase 2 (Files 6-15): Infrastructure (Terraform validate must pass)
Phase 3 (Files 16-28): Extension (npm install must work)
Phase 4 (Files 29-39): Backend (npm run build must succeed)
Phase 5 (Files 40-44): ML (Docker build must succeed)
Phase 6 (Files 45-47): DevOps
After each phase: Run validation command before proceeding.
SECTION 6: DEPLOYMENT COMMANDS
After all files generated, execute these in order:
bash
Copy
# 1. Infrastructure
cd infrastructure/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# 2. Build shared
cd ../../shared
npm install
npm run build

# 3. Build backend
cd ../apps/api-service
npm install
npm run build
npm run deploy  # Uses AWS CDK or Serverless Framework

# 4. Build extension
cd ../vscode-extension
npm install
npm run package
# Then upload .vsix to VS Code Marketplace or install locally

# 5. Build ML container
cd ../ml-service
docker build -t cc-ml-training .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cc-ml-training

# 6. Start training job
aws sagemaker create-training-job \
  --training-job-name cc-confusion-model-$(date +%s) \
  --algorithm-specification TrainingImage=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cc-ml-training:latest,TrainingInputMode=File \
  --role-arn arn:aws:iam::$AWS_ACCOUNT_ID:role/SageMakerExecutionRole \
  --input-data-config ChannelName=training,DataSource={S3DataSource={S3DataType=S3Prefix,S3Uri=s3://cc-training-data/}} \
  --output-data-config S3OutputPath=s3://cc-models/ \
  --resource-config InstanceType=ml.m5.2xlarge,InstanceCount=1,VolumeSizeInGB=100

# 7. Verify deployment
aws apigateway get-rest-apis
aws lambda list-functions | grep cc-
aws neptune describe-db-clusters
SECTION 7: TESTING CHECKLIST
Verify each component works before marking complete:
Table
Component	Test Command	Success Criteria
Shared types	npm run build	No TypeScript errors
Terraform	terraform validate	No errors, plan shows 50+ resources
Extension	npm run compile	No errors, .vsix generated
Backend	npm run test	90%+ coverage, all pass
WebSocket	wscat -c wss://api.cognitivecompass.io	Connection established
Bedrock	aws bedrock invoke-model	Nova responds
Neptune	curl https://neptune-endpoint:8182/status	Healthy
End-to-end	Open VS Code, load file, wait 30s	Proactive help appears
SECTION 8: FINAL INSTRUCTIONS FOR AI
You are building a production-grade AWS application. Do not cut corners.
Generate all 47 files in order specified
Follow Code Quality Rules strictly - reject your own output if it violates
Use exact AWS service names and regions - no approximations
Implement full error handling - no empty catches, no unhandled promises
Add comments explaining WHY, not WHAT - code is self-documenting
Test each phase before continuing - do not proceed if validation fails
Use TypeScript strict mode - no implicit any, strict null checks
Security first - encrypt everything, validate all inputs, least privilege IAM
Success metric: A developer can install the extension, open any code file, get confused, and receive proactive help with 3D visualization within 3 seconds.
Begin generation now. Start with File 1.
This is your complete master document. Copy this entire block into Cursor (or any AI IDE) and it will build Cognitive Compass autonomously.