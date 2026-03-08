import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  DataNode,
  DataEdge,
  DataFlowGraph,
  DataNodeType,
} from "@cognitive-compass/shared/types";

interface VsCodeApi {
  postMessage(msg: unknown): void;
}

declare global {
  interface Window {
    vscode?: VsCodeApi;
  }
}

const NODE_COLORS: Record<DataNodeType, string> = {
  variable: "#4fc1ff",
  function: "#4ec9b0",
  class: "#ce9178",
  module: "#dcdcaa",
  parameter: "#c586c0",
  return: "#f44747",
};

function calculateNodePositions(
  nodes: DataNode[],
): Record<string, [number, number, number]> {
  const positions: Record<string, [number, number, number]> = {};
  const radius = 3;

  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    positions[node.id] = [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0,
    ];
  });

  return positions;
}

interface NodeMeshProps {
  node: DataNode;
  position: [number, number, number];
  color: string;
  onSelect: (nodeId: string) => void;
}

const NodeMesh: React.FC<NodeMeshProps> = ({
  node,
  position,
  color,
  onSelect,
}) => {
  return (
    <mesh
      position={position}
      onClick={(e: any) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

interface EdgeLineProps {
  from: [number, number, number];
  to: [number, number, number];
}

const EdgeLine: React.FC<EdgeLineProps> = ({ from, to }) => {
  const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <primitive
      object={
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({ color: "#555555" }),
        )
      }
    />
  );
};

interface CodeGraphProps {
  dataFlow?: DataFlowGraph;
}

export const CodeGraph: React.FC<CodeGraphProps> = ({ dataFlow }) => {
  if (!dataFlow) {
    return null;
  }

  const positions = calculateNodePositions(dataFlow.nodes);

  const handleNodeSelect = (nodeId: string) => {
    window.vscode?.postMessage({ type: "nodeSelected", nodeId });
  };

  return (
    <Canvas style={{ height: "300px" }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls />
      {dataFlow.nodes.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          position={positions[node.id] || [0, 0, 0]}
          color={NODE_COLORS[node.type] || "#cccccc"}
          onSelect={handleNodeSelect}
        />
      ))}
      {dataFlow.edges.map((edge, idx) => (
        <EdgeLine
          key={idx}
          from={positions[edge.from] || [0, 0, 0]}
          to={positions[edge.to] || [0, 0, 0]}
        />
      ))}
    </Canvas>
  );
};
