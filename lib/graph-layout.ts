// A small hand-rolled force-directed layout — no graph/viz library needed at
// this app's scale (personal notes, expect dozens not thousands of nodes).
// Runs a fixed number of iterations client-side and returns final positions;
// not a live/continuous simulation.

export interface GraphPosition {
  x: number;
  y: number;
}

interface SimEdge {
  source: string;
  target: string;
}

const ITERATIONS = 300;
const REPULSION = 1800;
const SPRING_LENGTH = 110;
const SPRING_STRENGTH = 0.02;
const CENTERING_STRENGTH = 0.01;
const DAMPING = 0.85;

export function computeForceLayout(
  nodeIds: string[],
  edges: SimEdge[],
  width: number,
  height: number,
): Map<string, GraphPosition> {
  const margin = 40;
  const cx = width / 2;
  const cy = height / 2;

  const pos = new Map<string, GraphPosition>();
  const vel = new Map<string, GraphPosition>();

  nodeIds.forEach((id, i) => {
    const angle = (i / Math.max(nodeIds.length, 1)) * Math.PI * 2;
    const radius = Math.min(width, height) / 3;
    pos.set(id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    vel.set(id, { x: 0, y: 0 });
  });

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between every pair.
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const a = pos.get(nodeIds[i])!;
        const b = pos.get(nodeIds[j])!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          distSq = 1;
        }
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const va = vel.get(nodeIds[i])!;
        const vb = vel.get(nodeIds[j])!;
        va.x += fx;
        va.y += fy;
        vb.x -= fx;
        vb.y -= fy;
      }
    }

    // Spring attraction along edges.
    for (const edge of edges) {
      const a = pos.get(edge.source);
      const b = pos.get(edge.target);
      const va = vel.get(edge.source);
      const vb = vel.get(edge.target);
      if (!a || !b || !va || !vb) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - SPRING_LENGTH;
      const fx = (dx / dist) * displacement * SPRING_STRENGTH;
      const fy = (dy / dist) * displacement * SPRING_STRENGTH;
      va.x += fx;
      va.y += fy;
      vb.x -= fx;
      vb.y -= fy;
    }

    // Centering + integrate + damp.
    for (const id of nodeIds) {
      const p = pos.get(id)!;
      const v = vel.get(id)!;
      v.x += (cx - p.x) * CENTERING_STRENGTH;
      v.y += (cy - p.y) * CENTERING_STRENGTH;
      v.x *= DAMPING;
      v.y *= DAMPING;
      p.x = Math.min(width - margin, Math.max(margin, p.x + v.x));
      p.y = Math.min(height - margin, Math.max(margin, p.y + v.y));
    }
  }

  return pos;
}
