import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CodeGraph } from "./CodeGraph";
import { ExecutionPlayer } from "./ExecutionPlayer";
import {
  ExplanationResponse,
  CognitiveState,
  WebSocketMessage,
} from "@cognitive-compass/shared/types";

interface VsCodeApi {
  postMessage(msg: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
(window as Window & { vscode: VsCodeApi }).vscode = vscode;

const App: React.FC = () => {
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(
    null,
  );
  const [cognitiveState, setCognitiveState] = useState<CognitiveState | null>(
    null,
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as WebSocketMessage;
      if (data.type === "explanation_response") {
        setExplanation(data.payload as ExplanationResponse);
      }
      if (data.type === "cognitive_state") {
        setCognitiveState(data.payload as CognitiveState);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!explanation) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          color: "#cccccc",
        }}
      >
        Waiting for confusion detection...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{ height: "300px", border: "1px solid #333" }}>
        <CodeGraph dataFlow={explanation.dataFlow as any} />
      </div>
      <div style={{ padding: "10px" }}>
        <ExecutionPlayer steps={explanation.codeWalkthrough as any} />
      </div>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
