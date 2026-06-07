import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, RotateCcw, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Edge {
  id: string;
  u: number; // Node index
  v: number; // Node index
  weight: number;
  state: "idle" | "testing" | "accepted" | "rejected";
}

interface Node {
  id: number;
  x: number;
  y: number;
}

type DSU = Record<number, number>;

function find(parent: DSU, i: number): number {
  if (parent[i] === i) return i;
  return find(parent, parent[i]);
}

function union(parent: DSU, rank: Record<number, number>, x: number, y: number): boolean {
  const xroot = find(parent, x);
  const yroot = find(parent, y);

  if (xroot === yroot) return false;

  if (rank[xroot] < rank[yroot]) {
    parent[xroot] = yroot;
  } else if (rank[xroot] > rank[yroot]) {
    parent[yroot] = xroot;
  } else {
    parent[yroot] = xroot;
    rank[xroot]++;
  }
  return true;
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

const seedNodes: Node[] = [
  { id: 0, x: 150, y: 150 },
  { id: 1, x: 300, y: 80 },
  { id: 2, x: 450, y: 150 },
  { id: 3, x: 380, y: 280 },
  { id: 4, x: 220, y: 280 },
  { id: 5, x: 550, y: 220 },
];

const seedEdges: Edge[] = [
  { id: "e1", u: 0, v: 1, weight: 4, state: "idle" },
  { id: "e2", u: 0, v: 4, weight: 8, state: "idle" },
  { id: "e3", u: 1, v: 2, weight: 8, state: "idle" },
  { id: "e4", u: 1, v: 4, weight: 11, state: "idle" },
  { id: "e5", u: 2, v: 3, weight: 2, state: "idle" },
  { id: "e6", u: 2, v: 5, weight: 4, state: "idle" },
  { id: "e7", u: 3, v: 4, weight: 7, state: "idle" },
  { id: "e8", u: 3, v: 5, weight: 14, state: "idle" },
  { id: "e9", u: 4, v: 2, weight: 7, state: "idle" },
];

export default function KruskalViz() {
  const navigate = useNavigate();
  const [edges, setEdges] = useState<Edge[]>(() => [...seedEdges]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [statusText, setStatusText] = useState("Idle");
  const [dsuParent, setDsuParent] = useState<DSU>({});
  const cancelRef = useRef(false);

  const resetAll = useCallback(() => {
    setEdges(seedEdges.map((e) => ({ ...e, state: "idle" })));
    setDsuParent({});
    setStatusText("Visualizer reset.");
    cancelRef.current = true;
  }, []);

  const runKruskal = useCallback(async () => {
    if (running) {
      cancelRef.current = true;
      return;
    }
    cancelRef.current = false;
    setRunning(true);
    setStatusText("Starting Kruskal's algorithm...");

    // Initialize DSU
    const parent: DSU = {};
    const rank: Record<number, number> = {};
    seedNodes.forEach((n) => {
      parent[n.id] = n.id;
      rank[n.id] = 0;
    });
    setDsuParent({ ...parent });

    // Copy and sort edges by weight
    const sortedEdges = edges
      .map((e) => ({ ...e, state: "idle" as Edge["state"] }))
      .sort((a, b) => a.weight - b.weight);

    setEdges([...sortedEdges]);
    await delay(speed);

    let mstWeight = 0;
    let edgesAdded = 0;

    for (let i = 0; i < sortedEdges.length; i++) {
      if (cancelRef.current) break;

      const edge = sortedEdges[i];
      edge.state = "testing";
      setEdges([...sortedEdges]);
      setStatusText(`Testing edge (${edge.u} - ${edge.v}) with weight ${edge.weight}...`);
      await delay(speed);

      if (cancelRef.current) break;

      const uRoot = find(parent, edge.u);
      const vRoot = find(parent, edge.v);

      if (uRoot !== vRoot) {
        // Accept
        union(parent, rank, edge.u, edge.v);
        edge.state = "accepted";
        mstWeight += edge.weight;
        edgesAdded++;
        setDsuParent({ ...parent });
        setStatusText(`Accepted edge (${edge.u} - ${edge.v}). No cycle detected.`);
      } else {
        // Cycle detected, reject
        edge.state = "rejected";
        setStatusText(`Rejected edge (${edge.u} - ${edge.v}). Cycle detected!`);
      }

      setEdges([...sortedEdges]);
      await delay(speed);

      if (edgesAdded === seedNodes.length - 1) {
        setStatusText(`Minimal Spanning Tree complete! Total weight: ${mstWeight}`);
        break;
      }
    }

    setRunning(false);
  }, [edges, running, speed]);

  const edgeColor = (state: Edge["state"]) => {
    if (state === "testing") return "stroke-primary";
    if (state === "accepted") return "stroke-emerald-500";
    if (state === "rejected") return "stroke-rose-500/40";
    return "stroke-border";
  };

  const edgeWidth = (state: Edge["state"]) => {
    if (state === "accepted") return 4;
    if (state === "testing") return 3;
    return 2;
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Kruskal's MST</h1>
            <p className="text-sm text-muted-foreground">Find the Minimal Spanning Tree in a weighted graph using Disjoint Sets (DSU).</p>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between text-xs bg-card p-3 rounded-xl border">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-primary inline-block" /> Testing Edge
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" /> Accepted (MST)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-rose-500/40 inline-block" /> Cycle (Rejected)
            </span>
          </div>
          <span className="font-semibold text-muted-foreground">
            Status: <span className="font-mono text-primary font-bold">{statusText}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-center lg:col-span-2 overflow-x-auto">
            <svg width="600" height="350" className="mx-auto block" style={{ minWidth: 500 }}>
              {/* Edges */}
              {edges.map((edge) => {
                const uPos = seedNodes[edge.u];
                const vPos = seedNodes[edge.v];
                const midX = (uPos.x + vPos.x) / 2;
                const midY = (uPos.y + vPos.y) / 2;
                return (
                  <g key={edge.id}>
                    <line
                      x1={uPos.x}
                      y1={uPos.y}
                      x2={vPos.x}
                      y2={vPos.y}
                      className={`${edgeColor(edge.state)} transition-all duration-300`}
                      strokeWidth={edgeWidth(edge.state)}
                    />
                    {/* Weight Label */}
                    <rect x={midX - 10} y={midY - 10} width={20} height={20} rx={4} className="fill-card stroke-border/30" />
                    <text x={midX} y={midY + 4} textAnchor="middle" className="text-[10px] font-bold fill-current">
                      {edge.weight}
                    </text>
                  </g>
                );
              })}
              {/* Nodes */}
              {seedNodes.map((node) => (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r={18} className="fill-card stroke-border" strokeWidth={2} />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" className="text-xs font-bold fill-current">
                    {node.id}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-3">
              <h3 className="text-sm font-bold tracking-tight">Sorted Edges (Kruskal Queue)</h3>
              <div className="grid gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {edges.map((e) => (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs border transition-colors ${
                      e.state === "accepted"
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                        : e.state === "rejected"
                        ? "bg-rose-50/50 border-rose-200 text-rose-800"
                        : e.state === "testing"
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "bg-secondary/40 border-transparent"
                    }`}
                  >
                    <span>
                      Edge ({e.u} - {e.v})
                    </span>
                    <span className="font-bold">Weight: {e.weight}</span>
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(dsuParent).length > 0 && (
              <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-3">
                <h3 className="text-sm font-bold tracking-tight">DSU Representative Nodes (Union-Find)</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(dsuParent).map(([node, parent]) => (
                    <div key={node} className="p-2 rounded-lg bg-secondary/40 text-center text-xs border border-border/10">
                      <div className="text-muted-foreground font-mono text-[10px]">Node {node}</div>
                      <div className="font-bold font-mono mt-0.5">→ {parent}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Step Speed: {speed}ms</label>
            <input
              type="range"
              min={300}
              max={2000}
              step={100}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              disabled={running}
              className="flex-1 max-w-xs accent-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runKruskal} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? (
                <>
                  <Square className="w-4 h-4" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start Kruskal
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetAll} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
