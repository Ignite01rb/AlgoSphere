import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, RotateCcw, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BSTNode {
  id: number;
  value: number;
  left: BSTNode | null;
  right: BSTNode | null;
}

type NodeState = "idle" | "visiting" | "matched" | "fail";

let nodeCount = 0;
function makeNode(value: number): BSTNode {
  return { id: ++nodeCount, value, left: null, right: null };
}

function insertNode(root: BSTNode | null, value: number): BSTNode {
  if (!root) return makeNode(value);
  if (value < root.value) {
    root.left = insertNode(root.left, value);
  } else if (value > root.value) {
    root.right = insertNode(root.right, value);
  }
  return root;
}

function initBST(): BSTNode {
  nodeCount = 0;
  let root = makeNode(50);
  root = insertNode(root, 30);
  root = insertNode(root, 70);
  root = insertNode(root, 20);
  root = insertNode(root, 40);
  root = insertNode(root, 60);
  root = insertNode(root, 80);
  return root;
}

function getAllNodes(root: BSTNode | null): BSTNode[] {
  if (!root) return [];
  return [root, ...getAllNodes(root.left), ...getAllNodes(root.right)];
}

function computePositions(
  node: BSTNode | null,
  x: number,
  y: number,
  dx: number,
  positions: Map<number, { x: number; y: number }>
) {
  if (!node) return;
  positions.set(node.id, { x, y });
  computePositions(node.left, x - dx, y + 70, dx * 0.55, positions);
  computePositions(node.right, x + dx, y + 70, dx * 0.55, positions);
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function BSTViz() {
  const navigate = useNavigate();
  const [root, setRoot] = useState<BSTNode | null>(() => initBST());
  const [nodeStates, setNodeStates] = useState<Map<number, NodeState>>(new Map());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [inputValue, setInputValue] = useState("");
  const [statusText, setStatusText] = useState("Idle");
  const cancelRef = useRef(false);

  const allNodes = getAllNodes(root);
  const positions = new Map<number, { x: number; y: number }>();
  if (root) computePositions(root, 400, 40, 160, positions);

  const resetStates = useCallback(() => {
    setNodeStates(new Map());
    setStatusText("States cleared.");
  }, []);

  const handleInsert = async () => {
    const val = parseInt(inputValue, 10);
    if (isNaN(val) || running) return;
    setRunning(true);
    setInputValue("");
    setStatusText(`Inserting key: ${val}`);
    cancelRef.current = false;

    if (!root) {
      setRoot(makeNode(val));
      setStatusText(`Root node created with key ${val}`);
      setRunning(false);
      return;
    }

    let curr: BSTNode | null = root;
    const states = new Map<number, NodeState>();

    while (curr) {
      if (cancelRef.current) break;
      states.set(curr.id, "visiting");
      setNodeStates(new Map(states));
      await delay(speed);

      if (val === curr.value) {
        setStatusText(`Duplicate key ${val} already exists in BST.`);
        states.set(curr.id, "fail");
        setNodeStates(new Map(states));
        setRunning(false);
        return;
      }

      states.set(curr.id, "matched");
      setNodeStates(new Map(states));

      if (val < curr.value) {
        if (!curr.left) {
          curr.left = makeNode(val);
          setRoot({ ...root }); // trigger re-render
          setStatusText(`Inserted ${val} as left child of ${curr.value}`);
          break;
        }
        curr = curr.left;
      } else {
        if (!curr.right) {
          curr.right = makeNode(val);
          setRoot({ ...root }); // trigger re-render
          setStatusText(`Inserted ${val} as right child of ${curr.value}`);
          break;
        }
        curr = curr.right;
      }
    }

    setRunning(false);
  };

  const handleSearch = async () => {
    const val = parseInt(inputValue, 10);
    if (isNaN(val) || running || !root) return;
    setRunning(true);
    setInputValue("");
    setStatusText(`Searching for key: ${val}`);
    cancelRef.current = false;

    let curr: BSTNode | null = root;
    const states = new Map<number, NodeState>();
    let found = false;

    while (curr) {
      if (cancelRef.current) break;
      states.set(curr.id, "visiting");
      setNodeStates(new Map(states));
      await delay(speed);

      if (val === curr.value) {
        states.set(curr.id, "matched");
        setNodeStates(new Map(states));
        setStatusText(`Key ${val} found!`);
        found = true;
        break;
      }

      states.set(curr.id, "fail");
      setNodeStates(new Map(states));

      if (val < curr.value) {
        curr = curr.left;
      } else {
        curr = curr.right;
      }
    }

    if (!found && !cancelRef.current) {
      setStatusText(`Key ${val} is not in the BST.`);
    }
    setRunning(false);
  };

  const deleteFromTree = (node: BSTNode | null, val: number): BSTNode | null => {
    if (!node) return null;

    if (val < node.value) {
      node.left = deleteFromTree(node.left, val);
    } else if (val > node.value) {
      node.right = deleteFromTree(node.right, val);
    } else {
      // Node to delete found
      if (!node.left) return node.right;
      if (!node.right) return node.left;

      // Find min of right subtree
      let minNode = node.right;
      while (minNode.left) {
        minNode = minNode.left;
      }
      node.value = minNode.value;
      node.right = deleteFromTree(node.right, minNode.value);
    }
    return node;
  };

  const handleDelete = () => {
    const val = parseInt(inputValue, 10);
    if (isNaN(val) || running || !root) return;
    setInputValue("");
    resetStates();
    const newRoot = deleteFromTree({ ...root }, val);
    setRoot(newRoot);
    setStatusText(`Deleted key: ${val}`);
  };

  const nodeColor = (id: number) => {
    const st = nodeStates.get(id);
    if (st === "visiting") return "fill-primary stroke-primary";
    if (st === "matched") return "fill-emerald-500 stroke-emerald-500";
    if (st === "fail") return "fill-card stroke-rose-500";
    return "fill-card stroke-border";
  };

  const textColor = (id: number) => {
    const st = nodeStates.get(id);
    if (st === "visiting" || st === "matched") return "fill-white";
    if (st === "fail") return "text-rose-500 fill-rose-500";
    return "fill-current";
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Binary Search Tree (BST)</h1>
            <p className="text-sm text-muted-foreground">Interactive Binary Search Tree operations (insert, search, delete).</p>
          </div>
        </motion.div>

        <div className="flex items-center justify-between text-xs bg-card p-3 rounded-xl border">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full bg-primary inline-block" /> Visiting
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block" /> Found
            </span>
          </div>
          <span className="font-semibold text-muted-foreground">
            Status: <span className="font-mono text-primary font-bold">{statusText}</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm overflow-x-auto">
          {root ? (
            <svg
              width="800"
              height={Math.max(300, allNodes.length > 0 ? Math.max(...Array.from(positions.values()).map((p) => p.y)) + 60 : 300)}
              className="mx-auto block"
              style={{ minWidth: 600 }}
            >
              {/* Edges */}
              {allNodes.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;
                return [node.left, node.right].map((child) => {
                  if (!child) return null;
                  const cpos = positions.get(child.id);
                  if (!cpos) return null;
                  return (
                    <line
                      key={`${node.id}-${child.id}`}
                      x1={pos.x}
                      y1={pos.y}
                      x2={cpos.x}
                      y2={cpos.y}
                      className="stroke-border"
                      strokeWidth={2}
                    />
                  );
                });
              })}
              {/* Nodes */}
              {allNodes.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;
                return (
                  <g key={node.id}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={20}
                      className={`${nodeColor(node.id)} transition-all duration-300`}
                      strokeWidth={2}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      className={`text-xs font-bold ${textColor(node.id)} transition-all duration-300`}
                      style={{ pointerEvents: "none" }}
                    >
                      {node.value}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Tree is empty. Add a value to start.
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex gap-4">
            <Input
              type="number"
              placeholder="Enter a key..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={running}
              className="font-mono text-sm max-w-[200px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue) handleInsert();
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleInsert} disabled={running} className="gap-1 bg-primary text-white">
                <Plus className="w-3.5 h-3.5" /> Insert
              </Button>
              <Button size="sm" onClick={handleSearch} disabled={running || !root} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Search className="w-3.5 h-3.5" /> Search
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={running || !root} className="gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
              <Button variant="outline" size="sm" onClick={resetStates} disabled={running} className="gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Clear Trace
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setRoot(initBST()); resetStates(); }} disabled={running}>
                Reset Tree
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t pt-3">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Step Speed: {speed}ms</label>
            <input
              type="range"
              min={200}
              max={1500}
              step={50}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              disabled={running}
              className="flex-1 max-w-xs accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
