import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, RotateCcw, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface TreeNode {
  id: number;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

type NodeState = "idle" | "visiting" | "visited";

let idCounter = 0;

function makeNode(value: number): TreeNode {
  return { id: ++idCounter, value, left: null, right: null };
}

function buildBalancedTree(values: number[]): TreeNode | null {
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  const node = makeNode(values[mid]);
  node.left = buildBalancedTree(values.slice(0, mid));
  node.right = buildBalancedTree(values.slice(mid + 1));
  return node;
}

function generateTree(): TreeNode | null {
  const size = 10 + Math.floor(Math.random() * 6);
  const vals = Array.from({ length: size }, () => Math.floor(Math.random() * 99) + 1);
  vals.sort((a, b) => a - b);
  return buildBalancedTree([...new Set(vals)]);
}

function getAllNodes(root: TreeNode | null): TreeNode[] {
  if (!root) return [];
  return [root, ...getAllNodes(root.left), ...getAllNodes(root.right)];
}

// Traversal generators
function* inorder(node: TreeNode | null): Generator<number> {
  if (!node) return;
  yield* inorder(node.left);
  yield node.id;
  yield* inorder(node.right);
}
function* preorder(node: TreeNode | null): Generator<number> {
  if (!node) return;
  yield node.id;
  yield* preorder(node.left);
  yield* preorder(node.right);
}
function* postorder(node: TreeNode | null): Generator<number> {
  if (!node) return;
  yield* postorder(node.left);
  yield* postorder(node.right);
  yield node.id;
}
function* levelorder(root: TreeNode | null): Generator<number> {
  if (!root) return;
  const q: TreeNode[] = [root];
  while (q.length) {
    const node = q.shift()!;
    yield node.id;
    if (node.left) q.push(node.left);
    if (node.right) q.push(node.right);
  }
}

type Position = { x: number; y: number };

function computePositions(node: TreeNode | null, x: number, y: number, dx: number, positions: Map<number, Position>) {
  if (!node) return;
  positions.set(node.id, { x, y });
  computePositions(node.left, x - dx, y + 70, dx * 0.55, positions);
  computePositions(node.right, x + dx, y + 70, dx * 0.55, positions);
}

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export default function BinaryTreeViz() {
  const navigate = useNavigate();
  const [root, setRoot] = useState<TreeNode | null>(() => generateTree());
  const [nodeStates, setNodeStates] = useState<Map<number, NodeState>>(new Map());
  const [result, setResult] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(400);
  const [activeTraversal, setActiveTraversal] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const positions = new Map<number, Position>();
  if (root) computePositions(root, 400, 40, 160, positions);

  const allNodes = getAllNodes(root);
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));

  const resetStates = useCallback(() => {
    setNodeStates(new Map());
    setResult([]);
    setActiveTraversal(null);
  }, []);

  const runTraversal = useCallback(async (name: string, gen: Generator<number>) => {
    if (running) { cancelRef.current = true; return; }
    cancelRef.current = false;
    setRunning(true);
    setActiveTraversal(name);
    const states = new Map<number, NodeState>();
    setNodeStates(new Map(states));
    const res: number[] = [];
    setResult([]);

    for (const nodeId of gen) {
      if (cancelRef.current) break;
      states.set(nodeId, "visiting");
      setNodeStates(new Map(states));
      await delay(speed);
      if (cancelRef.current) break;
      states.set(nodeId, "visited");
      setNodeStates(new Map(states));
      const n = nodeMap.get(nodeId);
      if (n) res.push(n.value);
      setResult([...res]);
    }
    setRunning(false);
  }, [running, speed, nodeMap]);

  const stop = () => { cancelRef.current = true; };

  const nodeColor = (id: number) => {
    const st = nodeStates.get(id);
    if (st === "visiting") return "fill-primary stroke-primary";
    if (st === "visited") return "fill-green-500 stroke-green-500";
    return "fill-card stroke-border";
  };

  const textColor = (id: number) => {
    const st = nodeStates.get(id);
    if (st === "visiting" || st === "visited") return "fill-white";
    return "fill-current";
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Binary Tree</h1>
            <p className="text-sm text-muted-foreground">Visualize tree traversal algorithms.</p>
          </div>
        </motion.div>

        {result.length > 0 && (
          <div className="p-3 rounded-xl bg-card border text-sm">
            <span className="text-muted-foreground">{activeTraversal}: </span>
            <span className="font-mono font-bold">{result.join(" → ")}</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-card border shadow-sm overflow-x-auto">
          <svg width="800" height={Math.max(300, (allNodes.length > 0 ? Math.max(...Array.from(positions.values()).map(p => p.y)) + 80 : 300))} className="mx-auto block" style={{ minWidth: 600 }}>
            {/* Edges */}
            {allNodes.map(node => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              return [node.left, node.right].map(child => {
                if (!child) return null;
                const cpos = positions.get(child.id);
                if (!cpos) return null;
                return <line key={`${node.id}-${child.id}`} x1={pos.x} y1={pos.y} x2={cpos.x} y2={cpos.y} className="stroke-border" strokeWidth={2} />;
              });
            })}
            {/* Nodes */}
            {allNodes.map(node => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              return (
                <g key={node.id}>
                  <circle cx={pos.x} cy={pos.y} r={22} className={`${nodeColor(node.id)} transition-all duration-300`} strokeWidth={2} />
                  <text x={pos.x} y={pos.y + 5} textAnchor="middle" className={`text-xs font-bold ${textColor(node.id)} transition-all duration-300`} style={{ pointerEvents: "none" }}>
                    {node.value}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input type="range" min={100} max={1500} step={50} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Button variant="destructive" onClick={stop} className="gap-2"><Square className="w-4 h-4" /> Stop</Button>
            ) : (
              <>
                <Button size="sm" onClick={() => root && runTraversal("In-order", inorder(root))} className="gap-1"><Play className="w-3 h-3" /> In-order</Button>
                <Button size="sm" onClick={() => root && runTraversal("Pre-order", preorder(root))} className="gap-1"><Play className="w-3 h-3" /> Pre-order</Button>
                <Button size="sm" onClick={() => root && runTraversal("Post-order", postorder(root))} className="gap-1"><Play className="w-3 h-3" /> Post-order</Button>
                <Button size="sm" onClick={() => root && runTraversal("Level-order", levelorder(root))} className="gap-1"><Play className="w-3 h-3" /> Level-order</Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={resetStates} className="gap-1"><RotateCcw className="w-3 h-3" /> Reset</Button>
            <Button variant="outline" size="sm" onClick={() => { resetStates(); idCounter = 0; setRoot(generateTree()); }}>
              New Tree
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
