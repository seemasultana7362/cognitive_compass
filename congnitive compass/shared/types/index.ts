export interface CursorPayload {
  x: number;
  y: number;
  line: number;
  character: number;
  speed?: number;
  acceleration?: number;
}

export interface ScrollPayload {
  direction: 'up' | 'down';
  delta: number;
  startLine: number;
  endLine: number;
  totalLines: number;
}

export interface KeypressPayload {
  key?: string;
  isInsert: boolean;
  isDelete: boolean;
  isUndo: boolean;
  isRedo: boolean;
  changeSize: number;
}

export interface SelectionPayload {
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  isEmpty: boolean;
  duration?: number;
}

export interface TabSwitchPayload {
  from?: string;
  to?: string;
  isNewTab: boolean;
}

export interface FilePayload {
  path: string;
  languageId: string;
  lineCount: number;
  action: 'open' | 'close';
}

export interface HoverPayload {
  symbol: string;
  line: number;
  character: number;
}

export interface CommandPayload {
  commandId: string;
}

export type Payload =
  | CursorPayload
  | ScrollPayload
  | KeypressPayload
  | SelectionPayload
  | TabSwitchPayload
  | FilePayload
  | HoverPayload
  | CommandPayload;

export type EventType =
  | 'cursor'
  | 'scroll'
  | 'keypress'
  | 'selection'
  | 'tab_switch'
  | 'file'
  | 'hover'
  | 'command';

export interface TelemetryEvent {
  timestamp: number;
  userId: string;
  sessionId: string;
  projectId: string;
  eventType: EventType;
  payload: Payload;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export type CognitiveStateState =
  | 'focused'
  | 'confused'
  | 'frustrated'
  | 'learning'
  | 'exploring'
  | 'debugging'
  | 'idle';

export type RecommendedAction =
  | 'provide_explanation'
  | 'suggest_documentation'
  | 'offer_alternatives'
  | 'highlight_patterns'
  | 'suggest_debugging_steps'
  | 'none';

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';

export interface CognitiveState {
  state: CognitiveStateState;
  confidence: number;
  detectedSignals: ConfusionSignal[];
  predictedTimeToHelp: number;
  recommendedAction: RecommendedAction;
  learningStyle: LearningStyle;
}

export type SignalType =
  | 'rapid_tab_switch'
  | 'undo_spree'
  | 'long_pause'
  | 'scroll_oscillation'
  | 'rapid_filing'
  | 'mouse_hesitation'
  | 'hover_exploration'
  | 'selection_hesitation'
  | 'cursor_jerk';

export interface ConfusionSignal {
  type: SignalType;
  confidence: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ExplanationRequest {
  code: string;
  language: string;
  context: string;
  userQuery: string;
  confusionSignals: ConfusionSignal[];
  projectContext?: string;
}

export interface DataNode {
  id: string;
  label: string;
  type: 'variable' | 'function' | 'class' | 'module' | 'parameter' | 'return';
  description?: string;
  codeSnippet?: string;
  lineRange?: [number, number];
}

export interface DataEdge {
  from: string;
  to: string;
  label: string;
  type: 'data_flow' | 'control_flow' | 'dependency' | 'reference';
}

export interface DataFlowGraph {
  nodes: DataNode[];
  edges: DataEdge[];
}

export interface CodeStep {
  stepNumber: number;
  lineNumber: number;
  description: string;
  variables: Record<string, unknown>;
  stdout?: string;
}

export interface ExplanationResponse {
  id: string;
  timestamp: number;
  explanation: string;
  keyConcepts: string[];
  dataFlow: DataFlowGraph;
  codeWalkthrough: CodeStep[];
  confidence: number;
  reasoningTrace: string;
  suggestedQuestions: string[];
  estimatedReadTime: number;
}

export type MessageType =
  | 'request'
  | 'response'
  | 'notification'
  | 'error'
  | 'ack';

export interface AgentMessage {
  from: string;
  to: string;
  messageType: MessageType;
  payload: unknown;
  timestamp: number;
  conversationId: string;
  correlationId: string;
}

export interface DeveloperSession {
  id: string;
  userId: string;
  projectId: string;
  startTime: number;
  endTime?: number;
  events: TelemetryEvent[];
  cognitiveState?: CognitiveState;
  projectContext?: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    learningStyle?: LearningStyle;
    notifications: boolean;
  };
  createdAt: number;
  lastActive: number;
}

export type WebSocketMessageType =
  | 'telemetry'
  | 'cognitive_state'
  | 'explanation_request'
  | 'explanation_response'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: number;
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
