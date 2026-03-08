import * as vscode from "vscode";
import { EventEmitter } from "events";
import {
  CognitiveState,
  ExplanationRequest,
  ExplanationResponse,
} from "@cognitive-compass/shared/types";
import { hashCode } from "@cognitive-compass/shared/utils/encryption";
import { CognitiveStateDetector } from "./CognitiveStateDetector";
import { WebSocketManager, WebSocketMessage } from "./WebSocketManager";
import { z } from "zod";

export class AgentOrchestrator extends EventEmitter implements Disposable {
  private _cognitiveStateDetector: CognitiveStateDetector;
  private _webSocketManager: WebSocketManager;

  constructor(
    cognitiveStateDetector: CognitiveStateDetector,
    webSocketManager: WebSocketManager,
  ) {
    super();

    this._cognitiveStateDetector = cognitiveStateDetector;
    this._webSocketManager = webSocketManager;

    this._cognitiveStateDetector.on("confusionDetected", (state) => {
      this._handleConfusionDetected(state);
    });

    this._webSocketManager.on("message", (msg) => {
      this._handleWebSocketMessage(msg);
    });
  }

  private _handleConfusionDetected(state: CognitiveState): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const position = editor.selection.active;
    const filePath = document.uri.fsPath;
    const lineNumber = position.line + 1;
    const workspaceName =
      vscode.workspace.workspaceFolders?.[0]?.name ?? "unknown";

    const codeHash = hashCode(document.getText());

    const request: ExplanationRequest = {
      code: codeHash,
      language: document.languageId,
      context: `${filePath}:${lineNumber}`,
      userQuery: "auto_detected_confusion",
      confusionSignals: state.detectedSignals,
      projectContext: workspaceName,
    };

    this._webSocketManager.send({
      type: "explanation_request",
      payload: request,
      timestamp: Date.now(),
    });
  }

  private _handleWebSocketMessage(msg: WebSocketMessage): void {
    if (msg.type === "explanation_response") {
      const responseSchema = z.object({
        explanation: z.string(),
        dataFlow: z.unknown(),
        codeWalkthrough: z.array(z.unknown()),
      });
      const validated = responseSchema.parse(
        msg.payload,
      ) as ExplanationResponse;
      this.emit("explanation", validated);
    }

    if (msg.type === "cognitive_state") {
      const stateSchema = z.object({
        timestamp: z.number(),
        state: z.enum(["focused", "confused", "flow"]),
        confidence: z.number(),
        detectedSignals: z.array(z.string()),
      });
      const validated = stateSchema.parse(msg.payload) as CognitiveState;
      this.emit("stateUpdate", validated);
    }
  }

  public requestExplanation(
    code: string,
    language: string,
  ): { success: boolean; data?: void; error?: Error } {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { success: false, error: new Error("No active editor") };
    }

    if (!code || typeof code !== "string") {
      return {
        success: false,
        error: new Error("Code must be a non-empty string"),
      };
    }

    const validLanguages = [
      "javascript",
      "typescript",
      "python",
      "java",
      "csharp",
      "go",
      "rust",
      "cpp",
      "c",
    ];
    if (!validLanguages.includes(language)) {
      return {
        success: false,
        error: new Error(`Unsupported language: ${language}`),
      };
    }

    const document = editor.document;
    const position = editor.selection.active;
    const filePath = document.uri.fsPath;
    const lineNumber = position.line + 1;
    const workspaceName =
      vscode.workspace.workspaceFolders?.[0]?.name ?? "unknown";

    const codeHash = hashCode(code);

    const request: ExplanationRequest = {
      code: codeHash,
      language,
      context: `${filePath}:${lineNumber}`,
      userQuery: "manual_explanation_request",
      confusionSignals: [],
      projectContext: workspaceName,
    };

    this._webSocketManager.send({
      type: "explanation_request",
      payload: request,
      timestamp: Date.now(),
    });

    return { success: true, data: undefined };
  }

  public on(
    event: "explanation",
    listener: (response: ExplanationResponse) => void,
  ): this;
  public on(
    event: "stateUpdate",
    listener: (state: CognitiveState) => void,
  ): this;
  public on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  public emit(event: "explanation", response: ExplanationResponse): boolean;
  public emit(event: "stateUpdate", state: CognitiveState): boolean;
  public emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  public dispose(): void {
    this.removeAllListeners();
  }
}
