import * as vscode from "vscode";
import { EventEmitter } from "events";
import {
  TelemetryEvent,
  EventType,
  SelectionPayload,
  KeypressPayload,
  TabSwitchPayload,
  FilePayload,
  ScrollPayload,
} from "@cognitive-compass/shared/types";
import { encrypt } from "@cognitive-compass/shared/utils/encryption";

const BATCH_INTERVAL_MS = 100;
const MAX_BUFFER_SIZE = 1000;

let lastScrollTop: number | null = null;

export class TelemetryService
  extends EventEmitter
  implements vscode.Disposable
{
  private _disposables: vscode.Disposable[] = [];
  private _buffer: TelemetryEvent[] = [];
  private _timer: NodeJS.Timeout | undefined;
  private _enabled: boolean = true;
  private _sessionId: string;
  private _userId: string;

  constructor() {
    super();
    this._sessionId = crypto.randomUUID();
    this._userId = vscode.env.machineId;

    const selectionListener = vscode.window.onDidChangeTextEditorSelection(
      (event) => {
        if (event.textEditor) {
          const selection = event.textEditor.selection;
          const payload: SelectionPayload = {
            startLine: selection.start.line,
            startChar: selection.start.character,
            endLine: selection.end.line,
            endChar: selection.end.character,
            isEmpty: selection.isEmpty,
          };
          this._createEvent("selection", payload, event.textEditor);
        }
      },
    );
    this._disposables.push(selectionListener);

    const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
      const contentChanges = event.contentChanges[0];
      if (contentChanges) {
        const payload: KeypressPayload = {
          key: contentChanges.text || undefined,
          isInsert: contentChanges.text.length > 0,
          isDelete: contentChanges.rangeLength > 0,
          isUndo: event.reason === vscode.TextDocumentChangeReason.Undo,
          isRedo: event.reason === vscode.TextDocumentChangeReason.Redo,
          changeSize: contentChanges.text.length - contentChanges.rangeLength,
        };
        this._createEvent("keypress", payload, vscode.window.activeTextEditor);
      }
    });
    this._disposables.push(changeListener);

    const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
          const tabPayload: TabSwitchPayload = {
            from: "",
            to: editor.document.uri.fsPath,
            isNewTab: true,
          };
          this._createEvent("tab_switch", tabPayload, editor);

          const filePayload: FilePayload = {
            path: editor.document.uri.fsPath,
            languageId: editor.document.languageId,
            lineCount: editor.document.lineCount,
            action: "open",
          };
          this._createEvent("file", filePayload, editor);
        }
      },
    );
    this._disposables.push(activeEditorListener);

    const openListener = vscode.workspace.onDidOpenTextDocument((doc) => {
      const payload: FilePayload = {
        path: doc.uri.fsPath,
        languageId: doc.languageId,
        lineCount: doc.lineCount,
        action: "open",
      };
      this._createEvent("file", payload);
    });
    this._disposables.push(openListener);

    const closeListener = vscode.workspace.onDidCloseTextDocument((doc) => {
      const payload: FilePayload = {
        path: doc.uri.fsPath,
        languageId: doc.languageId,
        lineCount: doc.lineCount,
        action: "close",
      };
      this._createEvent("file", payload);
    });
    this._disposables.push(closeListener);

    const scrollListener = vscode.window.onDidChangeTextEditorVisibleRanges(
      (event) => {
        if (event.textEditor) {
          const visibleRanges = event.textEditor.visibleRanges;
          if (visibleRanges.length > 0) {
            const first = visibleRanges[0].start;
            const last = visibleRanges[visibleRanges.length - 1].end;
            const currentTop = first.line;

            let direction: "up" | "down" = "down";
            if (lastScrollTop !== null) {
              direction = currentTop > lastScrollTop ? "down" : "up";
            }

            const delta =
              lastScrollTop !== null ? Math.abs(currentTop - lastScrollTop) : 0;
            lastScrollTop = currentTop;

            const payload: ScrollPayload = {
              direction,
              delta,
              startLine: first.line,
              endLine: last.line,
              totalLines: event.textEditor.document.lineCount,
            };
            this._createEvent("scroll", payload, event.textEditor);
          }
        }
      },
    );
    this._disposables.push(scrollListener);

    this._timer = setInterval(() => this._flush(), BATCH_INTERVAL_MS);
  }

  private _createEvent(
    type: EventType,
    payload: unknown,
    editor?: vscode.TextEditor,
  ): TelemetryEvent {
    const projectId = vscode.workspace.workspaceFolders?.[0]?.name ?? "unknown";

    const event: TelemetryEvent = {
      timestamp: Date.now(),
      userId: this._userId,
      sessionId: this._sessionId,
      projectId,
      eventType: type,
      payload,
      filePath: editor?.document.uri.fsPath,
      lineNumber: editor?.selection.active.line,
      columnNumber: editor?.selection.active.character,
    };

    if (this._buffer.length < MAX_BUFFER_SIZE) {
      this._buffer.push(event);
    }

    return event;
  }

  private async _flush(): Promise<void> {
    if (!this._enabled || this._buffer.length === 0) {
      return;
    }

    const events = [...this._buffer];
    this._buffer = [];

    const encrypted = await encrypt(JSON.stringify(events), this._userId);

    this.emit("telemetryEncrypted", encrypted);
    this.emit("telemetry", events);
  }

  public enable(): void {
    this._enabled = true;
  }

  public disable(): void {
    this._enabled = false;
  }

  public toggle(): void {
    this._enabled = !this._enabled;
  }

  public get isEnabled(): boolean {
    return this._enabled;
  }

  public dispose(): void {
    if (this._timer) {
      clearInterval(this._timer);
    }
    this._disposables.forEach((d) => d.dispose());
    this.removeAllListeners();
  }

  public on(
    event: "telemetry",
    listener: (events: TelemetryEvent[]) => void,
  ): this;
  public on(
    event: "telemetryEncrypted",
    listener: (encrypted: string) => void,
  ): this;
  public on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  public emit(event: "telemetry", events: TelemetryEvent[]): boolean;
  public emit(event: "telemetryEncrypted", encrypted: string): boolean;
  public emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }
}
