import * as vscode from "vscode";
import { AgentOrchestrator } from "../services/AgentOrchestrator";
import { WebSocketMessage } from "../services/WebSocketManager";
import { z } from "zod";

const webviewMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("nodeSelected"), nodeId: z.string() }),
  z.object({ type: z.literal("highlightLine"), lineNumber: z.number() }),
]);

type WebviewMessage = z.infer<typeof webviewMessageSchema>;

export class WebviewProvider implements vscode.WebviewViewProvider, Disposable {
  private _view: vscode.WebviewView | undefined;
  private _extensionUri: vscode.Uri;
  private _orchestrator: AgentOrchestrator;
  private _disposables: vscode.Disposable[] = [];

  constructor(extensionUri: vscode.Uri, orchestrator: AgentOrchestrator) {
    this._extensionUri = extensionUri;
    this._orchestrator = orchestrator;

    this._orchestrator.on("explanation", (response) => {
      this.postMessage({
        type: "explanation_response",
        payload: response,
        timestamp: Date.now(),
      });
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);
    this._view = webviewView;

    const messageListener = webviewView.webview.onDidReceiveMessage((msg) => {
      this._handleWebviewMessage(msg);
    });
    this._disposables.push(messageListener);
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.js"),
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src 'unsafe-inline';">
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _handleWebviewMessage(msg: unknown): void {
    try {
      const validated = webviewMessageSchema.parse(msg) as WebviewMessage;

      if (validated.type === "nodeSelected") {
        vscode.window.showInformationMessage(
          `Node selected: ${validated.nodeId}`,
        );
      }

      if (validated.type === "highlightLine") {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const line = validated.lineNumber - 1;
          const range = editor.document.lineAt(line).range;
          editor.selection = new vscode.Selection(range.start, range.end);
          editor.revealRange(range);
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Invalid webview message: ${error}`);
    }
  }

  public postMessage(message: WebSocketMessage): void {
    this._view?.webview.postMessage(message);
  }

  public reveal(): void {
    this._view?.show(true);
  }

  public dispose(): void {
    this._disposables.forEach((d) => d.dispose());
  }
}
