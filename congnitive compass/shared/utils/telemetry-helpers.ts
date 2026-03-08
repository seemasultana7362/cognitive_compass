import { TelemetryEvent, ScrollPayload, KeypressPayload } from '../types';

const SCROLL_OSCILLATION_NORMALIZATION = 5;
const LONG_PAUSE_CAP_MS = 30000;
const CHARS_PER_WORD = 5;
const MIN_SCROLL_EVENTS = 3;

const WINDOWS = [5000, 30000, 120000, 300000];
const FEATURES_PER_WINDOW = 12;

function isScrollPayload(p: unknown): p is ScrollPayload {
  return (
    typeof p === 'object' &&
    p !== null &&
    'direction' in p &&
    (p.direction === 'up' || p.direction === 'down')
  );
}

function isKeypressPayload(p: unknown): p is KeypressPayload {
  return (
    typeof p === 'object' &&
    p !== null &&
    'isInsert' in p &&
    'isDelete' in p &&
    'isUndo' in p &&
    'isRedo' in p &&
    'changeSize' in p
  );
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const avg = average(arr);
  const squaredDiffs = arr.map((val) => Math.pow(val - avg, 2));
  return Math.sqrt(average(squaredDiffs));
}

export function calculateScrollOscillation(events: TelemetryEvent[]): number {
  const scrollEvents = events.filter(
    (e) => e.eventType === 'scroll' && isScrollPayload(e.payload)
  );

  if (scrollEvents.length < MIN_SCROLL_EVENTS) {
    return 0;
  }

  let directionChanges = 0;
  let previousDirection: string | null = null;

  for (const event of scrollEvents) {
    const payload = event.payload as ScrollPayload;
    if (previousDirection !== null && payload.direction !== previousDirection) {
      directionChanges++;
    }
    previousDirection = payload.direction;
  }

  return Math.min(1, directionChanges / SCROLL_OSCILLATION_NORMALIZATION);
}

export function detectLongPause(
  events: TelemetryEvent[],
  thresholdMs = 12000,
  now = Date.now()
): number {
  if (events.length === 0) {
    return 0;
  }

  const pauseDuration = now - events[events.length - 1].timestamp;

  if (pauseDuration > thresholdMs) {
    return Math.min(1, pauseDuration / LONG_PAUSE_CAP_MS);
  }

  return 0;
}

export function calculateTypingSpeed(
  events: TelemetryEvent[],
  windowMs = 60000,
  now = Date.now()
): number {
  const windowStart = now - windowMs;

  const keypressEvents = events.filter(
    (e) =>
      e.eventType === 'keypress' &&
      e.timestamp >= windowStart &&
      isKeypressPayload(e.payload) &&
      e.payload.isInsert
  );

  let totalChars = 0;
  for (const event of keypressEvents) {
    totalChars += (event.payload as KeypressPayload).changeSize;
  }

  return totalChars / CHARS_PER_WORD / (windowMs / 60000);
}

export function extractFeatures(events: TelemetryEvent[], now = Date.now()): number[] {
  const features = new Array(50).fill(0);

  for (let windowIdx = 0; windowIdx < WINDOWS.length; windowIdx++) {
    const windowSize = WINDOWS[windowIdx];
    const windowStart = now - windowSize;

    const windowEvents = events.filter((e) => e.timestamp >= windowStart);
    const baseIdx = windowIdx * FEATURES_PER_WINDOW;

    let cursorCount = 0;
    let scrollCount = 0;
    let keypressCount = 0;
    let tabSwitchCount = 0;

    for (const event of windowEvents) {
      switch (event.eventType) {
        case 'cursor':
          cursorCount++;
          break;
        case 'scroll':
          scrollCount++;
          break;
        case 'keypress':
          keypressCount++;
          break;
        case 'tab_switch':
          tabSwitchCount++;
          break;
      }
    }

    features[baseIdx] = cursorCount;
    features[baseIdx + 1] = scrollCount;
    features[baseIdx + 2] = keypressCount;
    features[baseIdx + 3] = tabSwitchCount;
    features[baseIdx + 4] = calculateScrollOscillation(windowEvents);

    let undoCount = 0;
    let deleteCount = 0;

    for (const event of windowEvents) {
      if (event.eventType === 'keypress' && isKeypressPayload(event.payload)) {
        if (event.payload.isUndo) undoCount++;
        if (event.payload.isDelete) deleteCount++;
      }
    }

    features[baseIdx + 5] = undoCount;
    features[baseIdx + 6] = deleteCount;

    if (windowEvents.length > 1) {
      const timestamps = windowEvents.map((e) => e.timestamp).sort((a, b) => a - b);
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      features[baseIdx + 7] = average(intervals);
      features[baseIdx + 8] = stdDev(intervals);
    } else {
      features[baseIdx + 7] = 0;
      features[baseIdx + 8] = 0;
    }

    features[baseIdx + 9] = 0;
    features[baseIdx + 10] = 0;
    features[baseIdx + 11] = 0;
  }

  features[48] = features[0] - features[12];
  features[49] = features[4] > 0.5 ? 1 : 0;

  return features;
}
