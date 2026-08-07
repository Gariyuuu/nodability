"use client";

import { useMemo } from "react";
import { computeForceLayout } from "@/lib/graph-layout";
import { GROUP_COLORS } from "@/lib/groups";
import type { GraphEdge, GraphNode } from "@/lib/notes";

const WIDTH = 700;
const HEIGHT = 480;

export default function NoteGraph({
  nodes,
  edges,
  onSelectNote,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNote: (id: string) => void;
}) {
  // Precomputed as plain variables (not inline expressions in the deps array below) so the
  // layout only recomputes when the graph's actual shape changes, not on every render.
  const nodeKey = nodes.map((n) => n.id).join(",");
  const edgeKey = edges.map((e) => `${e.source}-${e.target}`).join(",");
  const positions = useMemo(
    () =>
      computeForceLayout(
        nodes.map((n) => n.id),
        edges,
        WIDTH,
        HEIGHT,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeKey, edgeKey],
  );

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted">
        🕸️ No notes yet — add one and start linking with [[Note Title]] to see your graph
        grow.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full rounded-lg border border-border bg-surface"
    >
      {edges.map((edge, i) => {
        const a = positions.get(edge.source);
        const b = positions.get(edge.target);
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--border)"
            strokeWidth={1.5}
          />
        );
      })}
      {nodes.map((node) => {
        const p = positions.get(node.id);
        if (!p) return null;
        const color = node.categoryGroup ? GROUP_COLORS[node.categoryGroup] : "var(--muted)";
        return (
          <g
            key={node.id}
            transform={`translate(${p.x}, ${p.y})`}
            onClick={() => onSelectNote(node.id)}
            className="cursor-pointer"
          >
            <circle r={9} fill={color} stroke="var(--bg)" strokeWidth={2} />
            <text
              y={22}
              textAnchor="middle"
              fontSize={11}
              fill="var(--fg)"
              className="select-none"
            >
              {node.title.length > 20 ? `${node.title.slice(0, 20)}…` : node.title}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
