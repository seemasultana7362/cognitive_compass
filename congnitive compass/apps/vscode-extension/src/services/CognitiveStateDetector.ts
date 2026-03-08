import * as vscode from "vscode";
import { EventEmitter } from "events";
import {
  TelemetryEvent,
  CognitiveState,
  CognitiveStateState,
  ConfusionSignal,
  RecommendedAction,
  LearningStyle,
  ScrollPayload,
} from "@cognitive-compass/shared/types";
import { extractFeatures } from "@cognitive-compass/shared/utils/telemetry-helpers";
import { TelemetryService } from "./TelemetryService";
import {
  LocalPredictor,
  type RealTimePredictor,
} from "@cognitive-compass/ml-service/inference/real-time-predictor";

const BUFFER_WINDOW_MS = 300000;
const CONFUSION_THRESHOLD = 0.7;
const EVALUATION_INTERVAL_MS = 5000;

function calculateScrollOscillation(events: TelemetryEvent[]): number {
  const scrollEvents = events.filter((e) => e.eventType === "scroll");
  if (scrollEvents.length < 2) return 0;

  let oscillations = 0;
  let lastTop: number | null = null;

  for (const event of scrollEvents) {
    const payload = event.payload as ScrollPayload;
    if (lastTop !== null) {
      if (
        (payload.startLine > lastTop && oscillations % 2 === 0) ||
        (payload.startLine < lastTop && oscillations % 2 === 1)
      ) {
        oscillations++;
      }
    }
    lastTop = payload.startLine;
  }

  return Math.min(oscillations / Math.max(scrollEvents.length - 1, 1), 1);
}

function detectLongPause(events: TelemetryEvent[]): number {
  const now = Date.now();
  const relevantEvents = events.filter(
    (e) => e.eventType === "keypress" || e.eventType === "selection",
  );

  if (relevantEvents.length < 2) return 0;

  const lastEvent = relevantEvents[relevantEvents.length - 1];
  return now - lastEvent.timestamp;
}

function createConfusionSignal(
  type: ConfusionSignal["type"],
  confidence: number,
  metadata: Record<string, unknown> = {},
): ConfusionSignal {
  return {
    type,
    confidence,
    timestamp: Date.now(),
    metadata,
  };
}

function determineRecommendedAction(
  state: CognitiveStateState,
): RecommendedAction {
  switch (state) {
    case "confused":
      return "provide_explanation";
    case "frustrated":
      return "suggest_debugging_steps";
    case "learning":
      return "suggest_documentation";
    case "exploring":
      return "offer_alternatives";
    case "debugging":
      return "highlight_patterns";
    default:
      return "none";
  }
}

function inferLearningStyle(events: TelemetryEvent[]): LearningStyle {
  const scrollCount = events.filter((e) => e.eventType === "scroll").length;
  const hoverCount = events.filter((e) => e.eventType === "hover").length;
  const keypressCount = events.filter((e) => e.eventType === "keypress").length;

  if (scrollCount > keypressCount * 2) {
    return "visual";
  }
  if (hoverCount > keypressCount) {
    return "kinesthetic";
  }
  if (keypressCount > scrollCount * 2) {
    return "reading";
  }
  return "mixed";
}

export class CognitiveStateDetector
  extends EventEmitter
  implements vscode.Disposable
{
  private _eventBuffer: TelemetryEvent[] = [];
  private _currentState: CognitiveState;
  private _predictor: RealTimePredictor;
  private _evaluationTimer: NodeJS.Timeout;
  private _disposables: vscode.Disposable[] = [];

  constructor(telemetryService: TelemetryService) {
    super();

    this._predictor = new LocalPredictor();
    this._currentState = {
      state: "focused",
      confidence: 1.0,
      detectedSignals: [],
      predictedTimeToHelp: 0,
      recommendedAction: "none",
      learningStyle: "mixed",
    };

    const telemetryListener = (events: TelemetryEvent[]) => {
      this._eventBuffer.push(...events);
      const cutoff = Date.now() - BUFFER_WINDOW_MS;
      this._eventBuffer = this._eventBuffer.filter((e) => e.timestamp > cutoff);
    };

    telemetryService.on("telemetry", telemetryListener);
    this._disposables.push({
      dispose: () => telemetryService.off("telemetry", telemetryListener),
    });

    this._evaluationTimer = setInterval(
      () => this._evaluate(),
      EVALUATION_INTERVAL_MS,
    );
  }

  private async _evaluate(): Promise<void> {
    const features = extractFeatures(this._eventBuffer);
    const scrollOscillation = calculateScrollOscillation(this._eventBuffer);
    const longPause = detectLongPause(this._eventBuffer);

    const detectedSignals: ConfusionSignal[] = [];

    if (scrollOscillation > CONFUSION_THRESHOLD) {
      detectedSignals.push(
        createConfusionSignal("scroll_oscillation", scrollOscillation, {
          oscillationLevel: scrollOscillation,
        }),
      );
    }
    if (longPause > 30000) {
      detectedSignals.push(
        createConfusionSignal("long_pause", 0.8, {
          pauseDuration: longPause,
        }),
      );
    }

    const predictionResult = await this._predictor.predict(features);

    let state: CognitiveStateState = "focused";
    let confidence = 0.9;
    let predictedTimeToHelp = 0;

    if (predictionResult.success) {
      state = predictionResult.data.state as CognitiveStateState;
      confidence = predictionResult.data.confidence;
      predictedTimeToHelp = predictionResult.data.predictedTimeToHelp;
    } else {
      const scrollOscillation = calculateScrollOscillation(this._eventBuffer);
      if (scrollOscillation > CONFUSION_THRESHOLD) {
        state = "confused";
        confidence = scrollOscillation;
      }
      predictedTimeToHelp =
        state === "confused" ? Math.round(300 + Math.random() * 600) : 0;
    }

    const recommendedAction = determineRecommendedAction(state);
    const learningStyle = inferLearningStyle(this._eventBuffer);

    this._currentState = {
      state,
      confidence,
      detectedSignals,
      predictedTimeToHelp,
      recommendedAction,
      learningStyle,
    };

    this.emit("stateChange", this._currentState);

    if (state === "confused" && confidence > CONFUSION_THRESHOLD) {
      this.emit("confusionDetected", this._currentState);
    }
  }

  public on(
    event: "stateChange",
    listener: (state: CognitiveState) => void,
  ): this;
  public on(
    event: "confusionDetected",
    listener: (state: CognitiveState) => void,
  ): this;
  public on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  public emit(event: "stateChange", state: CognitiveState): boolean;
  public emit(event: "confusionDetected", state: CognitiveState): boolean;
  public emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  public dispose(): void {
    clearInterval(this._evaluationTimer);
    this._disposables.forEach((d) => d.dispose());
    this.removeAllListeners();
  }
}
