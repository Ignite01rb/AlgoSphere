import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, RotateCcw, Plus, Search as SearchIcon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TrieNode {
  id: string;
  char: string;
  isWord: boolean;
  children: Record<string, TrieNode>;
}

type NodeState = "idle" | "visiting" | "matched" | "fail";

let nodeCount = 0;
function makeNode(char: string): TrieNode {
  return {
    id: `${char}-${++nodeCount}`,
    char,
    isWord: false,
    children: {},
  };
}

function initTrie(): TrieNode {
  nodeCount = 0;
  const root = makeNode("▲");
  // Pre-populate with a few words
  insertWordDirect(root, "cat");
  insertWordDirect(root, "car");
  insertWordDirect(root, "dog");
  return root;
}

function insertWordDirect(root: TrieNode, word: string) {
  let curr = root;
  for (const ch of word.toLowerCase()) {
    if (!curr.children[ch]) {
      curr.children[ch] = makeNode(ch);
    }
    curr = curr.children[ch];
  }
  curr.isWord = true;
}

function getAllTrieNodes(root: TrieNode): TrieNode[] {
  const list: TrieNode[] = [root];
  const traverse = (node: TrieNode) => {
    for (const key of Object.keys(node.children)) {
      list.push(node.children[key]);
      traverse(node.children[key]);
    }
  };
  traverse(root);
  return list;
}

function computeTriePositions(
  node: TrieNode,
  x: number,
  y: number,
  width: number,
  positions: Map<string, { x: number; y: number }>
) {
  positions.set(node.id, { x, y });
  const keys = Object.keys(node.children).sort();
  if (keys.length === 0) return;

  const dx = width / keys.length;
  const startX = x - width / 2 + dx / 2;
  for (let i = 0; i < keys.length; i++) {
    computeTriePositions(node.children[keys[i]], startX + i * dx, y + 75, dx, positions);
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function TrieViz() {
  const navigate = useNavigate();
  const [root, setRoot] = useState<TrieNode>(() => initTrie());
  const [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(new Map());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [inputValue, setInputValue] = useState("");
  const [statusText, setStatusText] = useState("Idle");
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);
  const cancelRef = useRef(false);

  const allNodes = getAllTrieNodes(root);
  const positions = new Map<string, { x: number; y: number }>();
  computeTriePositions(root, 400, 40, 600, positions);

  const resetStates = useCallback(() => {
    setNodeStates(new Map());
    setStatusText("Reset complete.");
    setAutocompleteResults([]);
  }, []);

  const handleInsert = async () => {
    const word = inputValue.trim().toLowerCase();
    if (!word || running) return;
    setRunning(true);
    setStatusText(`Inserting: "${word}"`);
    setInputValue("");
    cancelRef.current = false;

    let curr = root;
    const states = new Map<string, NodeState>();
    states.set(curr.id, "visiting");
    setNodeStates(new Map(states));
    await delay(speed);

    for (const ch of word) {
      if (cancelRef.current) break;
      let nextNode = curr.children[ch];
      let isNew = false;
      if (!nextNode) {
        nextNode = makeNode(ch);
        curr.children[ch] = nextNode;
        isNew = true;
        setRoot({ ...root }); // force state update to recompute structure
      }

      states.set(nextNode.id, "visiting");
      setNodeStates(new Map(states));
      setStatusText(isNew ? `Creating new node for '${ch}'` : `Found existing node for '${ch}'`);
      await delay(speed);

      states.set(nextNode.id, "matched");
      setNodeStates(new Map(states));
      curr = nextNode;
    }

    if (!cancelRef.current) {
      curr.isWord = true;
      setStatusText(`Word "${word}" inserted successfully!`);
    }
    setRunning(false);
  };

  const handleSearch = async () => {
    const word = inputValue.trim().toLowerCase();
    if (!word || running) return;
    setRunning(true);
    setStatusText(`Searching for: "${word}"`);
    setInputValue("");
    cancelRef.current = false;

    let curr = root;
    const states = new Map<string, NodeState>();
    states.set(curr.id, "visiting");
    setNodeStates(new Map(states));
    await delay(speed);

    let found = true;
    for (const ch of word) {
      if (cancelRef.current) break;
      const nextNode = curr.children[ch];
      if (!nextNode) {
        setStatusText(`Character '${ch}' not found. Search failed.`);
        found = false;
        break;
      }

      states.set(nextNode.id, "visiting");
      setNodeStates(new Map(states));
      setStatusText(`Matching character '${ch}'...`);
      await delay(speed);

      states.set(nextNode.id, "matched");
      setNodeStates(new Map(states));
      curr = nextNode;
    }

    if (found && !cancelRef.current) {
      if (curr.isWord) {
        setStatusText(`Match found! "${word}" is in the Trie.`);
      } else {
        setStatusText(`Prefix matches, but "${word}" is not marked as a full word.`);
        states.set(curr.id, "fail");
        setNodeStates(new Map(states));
      }
    }
    setRunning(false);
  };

  const handleAutocomplete = async () => {
    const prefix = inputValue.trim().toLowerCase();
    if (running) return;
    setRunning(true);
    setStatusText(`Autocompleting prefix: "${prefix}"`);
    setInputValue("");
    cancelRef.current = false;

    let curr = root;
    const states = new Map<string, NodeState>();
    states.set(curr.id, "visiting");
    setNodeStates(new Map(states));
    await delay(speed);

    let found = true;
    for (const ch of prefix) {
      if (cancelRef.current) break;
      const nextNode = curr.children[ch];
      if (!nextNode) {
        setStatusText(`Prefix "${prefix}" does not exist.`);
        found = false;
        break;
      }

      states.set(nextNode.id, "visiting");
      setNodeStates(new Map(states));
      await delay(speed / 2);
      states.set(nextNode.id, "matched");
      setNodeStates(new Map(states));
      curr = nextNode;
    }

    if (found && !cancelRef.current) {
      const words: string[] = [];
      const dfs = (node: TrieNode, currentWord: string) => {
        if (node.isWord) {
          words.push(currentWord);
        }
        for (const k of Object.keys(node.children).sort()) {
          dfs(node.children[k], currentWord + k);
        }
      };
      dfs(curr, prefix);
      setAutocompleteResults(words);
      setStatusText(`Found ${words.length} suggestion(s) for prefix "${prefix}".`);

      // Highlight suggestions
      const highlightNodes = (node: TrieNode) => {
        states.set(node.id, "matched");
        for (const k of Object.keys(node.children)) {
          highlightNodes(node.children[k]);
        }
      };
      highlightNodes(curr);
      setNodeStates(new Map(states));
    }

    setRunning(false);
  };

  const nodeColor = (id: string, isWord: boolean) => {
    const st = nodeStates.get(id);
    if (st === "visiting") return "fill-primary stroke-primary";
    if (st === "matched") return "fill-emerald-500 stroke-emerald-500";
    if (st === "fail") return "fill-rose-500 stroke-rose-500";
    return isWord ? "fill-orange-100 stroke-orange-500" : "fill-card stroke-border";
  };

  const textColor = (id: string, isWord: boolean) => {
    const st = nodeStates.get(id);
    if (st === "visiting" || st === "matched" || st === "fail") return "fill-white";
    return isWord ? "fill-orange-600" : "fill-current";
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Trie (Prefix Tree)</h1>
            <p className="text-sm text-muted-foreground">Learn how prefix trees store, search, and autocomplete strings.</p>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4 text-xs bg-card p-3 rounded-xl border">
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full border border-orange-500 bg-orange-100 inline-block" /> Terminal Node (Word)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full bg-primary inline-block" /> Visiting
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block" /> Matched Node
          </span>
          <span className="font-semibold text-muted-foreground ml-auto">
            Status: <span className="font-mono text-primary font-bold">{statusText}</span>
          </span>
        </div>

        {autocompleteResults.length > 0 && (
          <div className="p-3 rounded-xl bg-card border text-sm space-y-1">
            <span className="text-muted-foreground font-semibold">Autocomplete Suggestions: </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {autocompleteResults.map((w) => (
                <span key={w} className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-semibold">
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-card border shadow-sm overflow-x-auto">
          <svg
            width="800"
            height={Math.max(300, allNodes.length > 0 ? Math.max(...Array.from(positions.values()).map((p) => p.y)) + 60 : 300)}
            className="mx-auto block"
            style={{ minWidth: 680 }}
          >
            {/* Edges */}
            {allNodes.map((node) => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              return Object.keys(node.children).map((key) => {
                const child = node.children[key];
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
                    r={18}
                    className={`${nodeColor(node.id, node.isWord)} transition-all duration-300`}
                    strokeWidth={2}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    className={`text-xs font-bold ${textColor(node.id, node.isWord)} transition-all duration-300`}
                    style={{ pointerEvents: "none" }}
                  >
                    {node.char}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter word/prefix (e.g. 'cat', 'cart')..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={running}
              className="font-mono text-sm max-w-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue) handleSearch();
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleInsert} disabled={running} className="gap-1 bg-primary text-white">
                <Plus className="w-3.5 h-3.5" /> Insert
              </Button>
              <Button size="sm" onClick={handleSearch} disabled={running} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <SearchIcon className="w-3.5 h-3.5" /> Search
              </Button>
              <Button size="sm" onClick={handleAutocomplete} disabled={running} className="gap-1 bg-violet-600 hover:bg-violet-700 text-white">
                <Sparkles className="w-3.5 h-3.5" /> Autocomplete
              </Button>
              <Button variant="outline" size="sm" onClick={resetStates} disabled={running} className="gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Clear Trace
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setRoot(initTrie()); resetStates(); }} disabled={running}>
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
