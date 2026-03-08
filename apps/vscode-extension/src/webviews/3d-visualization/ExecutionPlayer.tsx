import React, { useState, useEffect } from "react";
import { CodeStep } from "@cognitive-compass/shared/types";

interface VsCodeApi {
  postMessage(msg: unknown): void;
}

declare global {
  interface Window {
    vscode?: VsCodeApi;
  }
}

const PLAY_INTERVAL_MS = 2000;

interface ExecutionPlayerProps {
  steps?: CodeStep[];
}

export const ExecutionPlayer: React.FC<ExecutionPlayerProps> = ({ steps }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && steps && steps.length > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, PLAY_INTERVAL_MS);
    }

    return () => clearInterval(interval);
  }, [isPlaying, steps, currentStep]);

  useEffect(() => {
    if (steps && steps.length > 0 && steps[currentStep]) {
      window.vscode?.postMessage({
        type: "highlightLine",
        lineNumber: steps[currentStep].lineNumber,
      });
    }
  }, [currentStep, steps]);

  if (!steps || steps.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
        No execution steps available
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div style={{ padding: "10px", fontFamily: "monospace", fontSize: "12px" }}>
      <div style={{ marginBottom: "10px" }}>
        <strong>
          Step {currentStep + 1} of {steps.length}
        </strong>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <div>
          <strong>Line:</strong> {step.lineNumber}
        </div>
        <div>
          <strong>Description:</strong> {step.description}
        </div>
      </div>

      {step.variables && (
        <div style={{ marginBottom: "10px" }}>
          <strong>Variables:</strong>
          <pre style={{ background: "#222", padding: "5px", margin: "5px 0" }}>
            {JSON.stringify(step.variables, null, 2)}
          </pre>
        </div>
      )}

      {step.stdout && (
        <div style={{ marginBottom: "10px" }}>
          <strong>Output:</strong>
          <pre style={{ background: "#222", padding: "5px", margin: "5px 0" }}>
            {step.stdout}
          </pre>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginTop: "15px",
        }}
      >
        <button
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          style={{
            padding: "5px 10px",
            cursor: currentStep === 0 ? "not-allowed" : "pointer",
            opacity: currentStep === 0 ? 0.5 : 1,
          }}
        >
          Previous
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ padding: "5px 10px", cursor: "pointer" }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          onClick={() =>
            setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))
          }
          disabled={currentStep === steps.length - 1}
          style={{
            padding: "5px 10px",
            cursor:
              currentStep === steps.length - 1 ? "not-allowed" : "pointer",
            opacity: currentStep === steps.length - 1 ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};
