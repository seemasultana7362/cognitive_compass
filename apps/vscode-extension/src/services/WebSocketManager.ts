import { EventEmitter } from "events";
import WebSocket from "ws";
import { z } from "zod";
import pino from "pino";

const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL_MS = 30000;
const BACKOFF_MULTIPLIER = 2;

const logger = pino({ name: "websocket-manager" });

export const webSocketMessageSchema = z.object({
  type: z.enum([
    "telemetry",
    "cognitive_state",
    "explanation_request",
    "explanation_response",
    "error",
  ]),
  payload: z.unknown(),
  timestamp: z.number(),
});

export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;

export class WebSocketManager extends EventEmitter implements Disposable {
  private _ws: WebSocket | undefined;
  private _reconnectAttempts: number = 0;
  private _pingTimer: NodeJS.Timeout | undefined;
  private _endpoint: string = "";
  private _queue: WebSocketMessage[] = [];
  private _disposed: boolean = false;

  public connect(endpoint: string): void {
    this._endpoint = endpoint;
    this._ws = new WebSocket(endpoint);

    this._ws.onopen = () => {
      this._reconnectAttempts = 0;
      this._pingTimer = setInterval(() => {
        this._ws?.ping();
      }, PING_INTERVAL_MS);
      this._flushQueue();
      this.emit("connected");
    };

    this._ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as WebSocketMessage;
        const validated = webSocketMessageSchema.parse(parsed);
        this.emit("message", validated);
      } catch (error) {
        logger.error({ error }, "Failed to parse WebSocket message");
      }
    };

    this._ws.onerror = (error) => {
      logger.error({ error }, "WebSocket error");
      this.emit("error", error);
    };

    this._ws.onclose = () => {
      if (this._pingTimer) {
        clearInterval(this._pingTimer);
      }
      if (!this._disposed && this._reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this._reconnect();
      }
    };
  }

  public send(message: WebSocketMessage): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(message));
    } else {
      this._queue.push(message);
    }
  }

  private _flushQueue(): void {
    while (this._queue.length > 0 && this._ws?.readyState === WebSocket.OPEN) {
      const message = this._queue.shift();
      if (message) {
        this._ws.send(JSON.stringify(message));
      }
    }
  }

  private _reconnect(): void {
    this._reconnectAttempts++;
    const delay =
      RECONNECT_DELAY_MS * BACKOFF_MULTIPLIER ** this._reconnectAttempts;
    setTimeout(() => this.connect(this._endpoint), delay);
  }

  public on(event: "connected", listener: () => void): this;
  public on(event: "message", listener: (msg: WebSocketMessage) => void): this;
  public on(event: "error", listener: (err: Error) => void): this;
  public on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  public emit(event: "connected"): boolean;
  public emit(event: "message", msg: WebSocketMessage): boolean;
  public emit(event: "error", err: Error): boolean;
  public emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  public dispose(): void {
    this._disposed = true;
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
    }
    this._ws?.close(1000);
    this.removeAllListeners();
  }
}
