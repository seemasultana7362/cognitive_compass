import * as vscode from "vscode";
import { TelemetryService } from "./services/TelemetryService";
import { CognitiveStateDetector } from "./services/CognitiveStateDetector";
import { WebSocketManager } from "./services/WebSocketManager";
import { AgentOrchestrator } from "./services/AgentOrchestrator";
import { WebviewProvider } from "./providers/WebviewProvider";
import {
  handleExplainCommand,
  handleShowPanelCommand,
  handleToggleTelemetryCommand,
} from "./commands/CommandHandlers";
import pino from "pino";

const logger = pino({ name: "cognitive-compass" });

const WEBSOCKET_ENDPOINT =
  process.env.WEBSOCKET_ENDPOINT || "wss://api.example.com/ws";

let telemetryService: TelemetryService;
let cognitiveStateDetector: CognitiveStateDetector;
let webSocketManager: WebSocketManager;
let agentOrchestrator: AgentOrchestrator;
let webviewProvider: WebviewProvider;

export function activate(context: vscode.ExtensionContext): void {
  telemetryService = new TelemetryService();
  cognitiveStateDetector = new CognitiveStateDetector(telemetryService);
  webSocketManager = new WebSocketManager();
  agentOrchestrator = new AgentOrchestrator(
    cognitiveStateDetector,
    webSocketManager,
  );
  webviewProvider = new WebviewProvider(
    context.extensionUri,
    agentOrchestrator,
  );

  try {
    webSocketManager.connect(WEBSOCKET_ENDPOINT);
    logger.info(
      { endpoint: WEBSOCKET_ENDPOINT },
      "WebSocket connection initiated",
    );
  } catch (error) {
    logger.error({ error }, "Failed to initiate WebSocket connection");
  }

  const webviewRegistration = vscode.window.registerWebviewViewProvider(
    "cognitiveCompassPanel",
    webviewProvider,
  );
  context.subscriptions.push(webviewRegistration);

  const explainCommand = vscode.commands.registerCommand(
    "cognitiveCompass.explain",
    () => {
      return handleExplainCommand(agentOrchestrator, webviewProvider);
    },
  );

  const showPanelCommand = vscode.commands.registerCommand(
    "cognitiveCompass.showPanel",
    () => {
      return handleShowPanelCommand(webviewProvider);
    },
  );

  const toggleTelemetryCommand = vscode.commands.registerCommand(
    "cognitiveCompass.toggleTelemetry",
    () => {
      return handleToggleTelemetryCommand(telemetryService);
    },
  );

  context.subscriptions.push(
    telemetryService,
    cognitiveStateDetector,
    webSocketManager,
    agentOrchestrator,
    webviewProvider,
    explainCommand,
    showPanelCommand,
    toggleTelemetryCommand,
  );

  vscode.window.showInformationMessage("Cognitive Compass activated");
}

export function deactivate(): void {
  telemetryService?.dispose();
  cognitiveStateDetector?.dispose();
  webSocketManager?.dispose();
  agentOrchestrator?.dispose();
  webviewProvider?.dispose();
}
