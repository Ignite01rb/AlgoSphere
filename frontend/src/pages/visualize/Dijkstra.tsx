import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, RotateCcw, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type NodeState = "idle" | "current" | "visited" | "finalized";
type EdgeState = "idle" | "relaxing" | "inPath";

interface GraphNode { id: number; x: number; y: number; label: string; }
interface GraphEdge { from: number; to: number; weight: number; }

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

const NODES: GraphNode[] = [
  { id: 0, x: 80, y: 160, label: "A" },
  { id: 1, x: 200, y: 60, label: "B" },
  { id: 2, x: 200, y: 260, label: "C" },
  { id: 3, x: 360, y: 60, label: "D" },
  { id: 4, x: 360, y: 260, label: "E" },
  { id: 5, x: 520, y: 60, label: "F" },
  { id: 6, x: 520, y: 260, label: "G" },
  { id: 7, x: 640, y: 160, label: "H" },
];

function randomEdges(): GraphEdge[] {
  const rw = () => Math.floor(Math.random() * 9) + 1;
  return [
    { from: 0, to: 1, weight: rw() }, { from: 0, to: 2, weight: rw() },
    { from: 1, to: 3, weight: rw() }, { from: 2, to: 4, weight: rw() },
    { from: 1, to: 2, weight: rw() }, { from: 3, to: 5, weight: rw() },
    { from: 4, to: 6, weight: rw() }, { from: 3, to: 4, weight: rw() },
    { from: 5, to: 7, weight: rw() }, { from: 6, to: 7, weight: rw() },
    { from: 5, to: 6, weight: rw() }, { from: 2, to: 3, weight: rw() },
  ];
}

export default function DijkstraViz() {
  const navigate = useNavigate();
  const [edges, setEdges] = useState<GraphEdge[]>(() => randomEdges());
  const [nodeStates, setNodeStates] = useState<Map<number, NodeState>>(new Map());
  const [edgeStates, setEdgeStates] = useState<Map<string, EdgeState>>(new Map());
  const [distances, setDistances] = useState<Map<number, number>>(new Map());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const cancelRef = useRef(false);

  const reset = useCallback(() => {
    setNodeStates(new Map());
    setEdgeStates(new Map());
    setDistances(new Map());
  }, []);

  const start = useCallback(async () => {
    if (running) { cancelRef.current = true; return; }
    cancelRef.current = false;
    setRunning(true);
    reset();

    const dist = new Map<number, number>();
    const prev = new Map<number, number>();
    const visited = new Set<number>();
    const ns = new Map<number, NodeState>();
    const es = new Map<string, EdgeState>();

    const adj = new Map<number, { to: number; weight: number }[]>();
    for (const n of NODES) adj.set(n.id, []);
    for (const e of edges) {
      adj.get(e.from)!.push({ to: e.to, weight: e.weight });
      adj.get(e.to)!.push({ to: e.from, weight: e.weight });
    }

    for (const n of NODES) dist.set(n.id, Infinity);
    dist.set(0, 0);
    setDistances(new Map(dist));

    while (visited.size < NODES.length) {
      if (cancelRef.current) break;
      let u = -1, minDist = Infinity;
      for (const n of NODES) {
        if (!visited.has(n.id) && (dist.get(n.id) ?? Infinity) < minDist) {
          minDist = dist.get(n.id) ?? Infinity;
          u = n.id;
        }
      }
      if (u === -1 || minDist === Infinity) break;

      ns.set(u, "current");
      setNodeStates(new Map(ns));
      await delay(speed);
      if (cancelRef.current) break;

      for (const { to, weight } of adj.get(u) ?? []) {
        if (cancelRef.current) break;
        if (visited.has(to)) continue;
        const eKey = `${Math.min(u, to)}-${Math.max(u, to)}`;
        es.set(eKey, "relaxing");
        setEdgeStates(new Map(es));
        const newDist = (dist.get(u) ?? Infinity) + weight;
        if (newDist < (dist.get(to) ?? Infinity)) {
          dist.set(to, newDist);
          prev.set(to, u);
          setDistances(new Map(dist));
        }
        await delay(speed / 3);
        es.set(eKey, "idle");
        setEdgeStates(new Map(es));
      }

      visited.add(u);
      ns.set(u, "finalized");
      setNodeStates(new Map(ns));
      setDistances(new Map(dist));
    }

    if (!cancelRef.current) {
      let cur = 7;
      while (prev.has(cur)) {
        const p = prev.get(cur)!;
        const eKey = `${Math.min(p, cur)}-${Math.max(p, cur)}`;
        es.set(eKey, "inPath");
        setEdgeStates(new Map(es));
        await delay(speed / 2);
        cur = p;
      }
    }
    setRunning(false);
  }, [edges, running, speed, reset]);

  const nodeColor = (id: number) => {
    const s = nodeStates.get(id);
    if (s === "current") return "fill-amber-400 stroke-amber-500";
    if (s === "finalized") return "fill-green-500 stroke-green-600";
    return "fill-card stroke-border";
  };

  const edgeColor = (from: number, to: number) => {
    const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
    const s = edgeStates.get(key);
    if (s === "relaxing") return "stroke-primary";
    if (s === "inPath") return "stroke-amber-400";
    return "stroke-muted-foreground/40";
  };
  const edgeWidth = (from: number, to: number) => {
    const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
    const s = edgeStates.get(key);
    return s === "inPath" ? 4 : s === "relaxing" ? 3 : 1.5;
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dijkstra's Algorithm</h1>
            <p className="text-sm text-muted-foreground">Find shortest paths from A to all nodes in a weighted graph.</p>
          </div>
        </motion.div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm overflow-x-auto">
          <svg width="720" height="320" className="mx-auto block" style={{ minWidth: 500 }}>
            {edges.map((e, i) => {
              const from = NODES[e.from], to = NODES[e.to];
              const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
              return (
                <g key={i}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`${edgeColor(e.from, e.to)} transition-all duration-300`} strokeWidth={edgeWidth(e.from, e.to)} />
                  <rect x={mx - 10} y={my - 9} width={20} height={18} rx={4} className="fill-background/80" />
                  <text x={mx} y={my + 4} textAnchor="middle" className="fill-current text-[11px] font-bold">{e.weight}</text>
                </g>
              );
            })}
            {NODES.map(n => (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={24} className={`${nodeColor(n.id)} transition-all duration-300`} strokeWidth={2} />
                <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle" className="fill-current text-sm font-bold" style={{ pointerEvents: "none" }}>{n.label}</text>
                {distances.has(n.id) && (
                  <text x={n.x} y={n.y + 38} textAnchor="middle" className="fill-muted-foreground text-[10px] font-mono">
                    {distances.get(n.id) === Infinity ? "\u221E" : distances.get(n.id)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {distances.size > 0 && (
          <div className="p-3 rounded-xl bg-card border">
            <div className="flex flex-wrap gap-3 text-xs">
              {NODES.map(n => (
                <span key={n.id} className={`px-2 py-1 rounded font-mono ${nodeStates.get(n.id) === "finalized" ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-secondary"}`}>
                  {n.label}: {distances.get(n.id) === Infinity ? "\u221E" : distances.get(n.id)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input type="range" min={100} max={1500} step={50} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={start} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Run Dijkstra</>}
            </Button>
            <Button variant="outline" onClick={reset} className="gap-2"><RotateCcw className="w-4 h-4" /> Reset</Button>
            <Button variant="outline" onClick={() => { reset(); setEdges(randomEdges()); }} className="gap-2"><Shuffle className="w-4 h-4" /> New Weights</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
