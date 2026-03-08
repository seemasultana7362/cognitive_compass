import * as vscode from "vscode";
import { AgentOrchestrator } from "../services/AgentOrchestrator";
import { WebviewProvider } from "../providers/WebviewProvider";
import { TelemetryService } from "../services/TelemetryService";

export function handleExplainCommand(
  orchestrator: AgentOrchestrator,
  _webviewProvider: WebviewProvider,
): { success: boolean; data?: void; error?: Error } {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { success: false, error: new Error("No active text editor") };
    }

    const selection = editor.selection;
    const document = editor.document;

    let text: string;
    if (selection.isEmpty) {
      const line = editor.selection.active.line;
      text = document.lineAt(line).text;
    } else {
      text = document.getText(selection);
    }

    const language = document.languageId;
    return orchestrator.requestExplanation(text, language);
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export function handleShowPanelCommand(webviewProvider: WebviewProvider): {
  success: boolean;
  data?: void;
  error?: Error;
} {
  try {
    webviewProvider.reveal();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export function handleToggleTelemetryCommand(
  telemetryService: TelemetryService,
): { success: boolean; data?: void; error?: Error } {
  try {
    telemetryService.toggle();
    const message = telemetryService.isEnabled
      ? "Cognitive Compass Telemetry: ON"
      : "Cognitive Compass Telemetry: OFF";
    vscode.window.setStatusBarMessage(message);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
