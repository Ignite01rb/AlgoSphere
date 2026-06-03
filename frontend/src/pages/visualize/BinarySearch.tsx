import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type CellState = "idle" | "low" | "mid" | "high" | "visited" | "found" | "eliminated";

function randomSortedArray(size = 20): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 50)).sort((a, b) => a - b);
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function BinarySearchViz() {
  const navigate = useNavigate();
  const [arr, setArr] = useState<number[]>(() => randomSortedArray());
  const [target, setTarget] = useState<number | null>(null);
  const [states, setStates] = useState<CellState[]>([]);
  const [pointers, setPointers] = useState<{low: number; mid: number; high: number} | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [arrayInput, setArrayInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => { setStates(arr.map(() => "idle")); }, [arr]);

  const start = useCallback(async () => {
    if (running) { cancelRef.current = true; return; }

    let currentArr = arr;
    if (arrayInput.trim()) {
      const parsed = arrayInput.replace(/[[\]{}()]/g, "").split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
      if (!parsed.length) return;
      currentArr = parsed.sort((a, b) => a - b);
      setArr(currentArr);
    }

    let t = target;
    if (targetInput.trim()) { t = Number(targetInput); if (isNaN(t)) return; }
    else { t = currentArr[Math.floor(Math.random() * currentArr.length)]; }
    setTarget(t);

    cancelRef.current = false;
    setRunning(true);
    const s = currentArr.map(() => "idle" as CellState);

    let low = 0, high = currentArr.length - 1;
    while (low <= high) {
      if (cancelRef.current) break;
      const mid = Math.floor((low + high) / 2);

      // Mark eliminated
      const newS = currentArr.map((_, i) => (i < low || i > high ? "eliminated" : "idle") as CellState);
      newS[low] = "low"; newS[high] = "high"; newS[mid] = "mid";
      setStates([...newS]);
      setPointers({ low, mid, high });
      await delay(speed);
      if (cancelRef.current) break;

      if (currentArr[mid] === t) {
        newS[mid] = "found";
        setStates([...newS]);
        setPointers(null);
        break;
      } else if (currentArr[mid] < t) { low = mid + 1; }
      else { high = mid - 1; }
      await delay(speed / 2);
    }
    setRunning(false);
  }, [arr, target, speed, arrayInput, targetInput, running]);

  const cellClass = (state: CellState) => {
    const base = "w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold border transition-all duration-300 relative";
    switch (state) {
      case "low": return `${base} ring-2 ring-blue-500 bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400`;
      case "high": return `${base} ring-2 ring-blue-500 bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400`;
      case "mid": return `${base} ring-2 ring-primary scale-110 bg-primary/20 border-primary text-primary`;
      case "found": return `${base} ring-2 ring-green-500 scale-125 bg-green-500/20 border-green-500 text-green-600 dark:text-green-400`;
      case "eliminated": return `${base} opacity-25 bg-muted border-border text-muted-foreground`;
      case "visited": return `${base} opacity-40 bg-muted border-border text-muted-foreground`;
      default: return `${base} bg-card border-border text-foreground`;
    }
  };

  const pointerLabel = (i: number) => {
    if (!pointers) return null;
    const labels: string[] = [];
    if (i === pointers.low) labels.push("L");
    if (i === pointers.mid) labels.push("M");
    if (i === pointers.high) labels.push("H");
    if (!labels.length) return null;
    return <span className="absolute -bottom-5 text-[10px] font-bold text-primary">{labels.join("/")}</span>;
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Binary Search</h1>
            <p className="text-sm text-muted-foreground">Divide and conquer on a sorted array.</p>
          </div>
        </motion.div>

        {target !== null && (
          <div className="flex gap-4 text-sm">
            <span>Target: <span className="text-primary font-bold">{target}</span></span>
            <span className="text-blue-500 font-mono text-xs">L = Low</span>
            <span className="text-primary font-mono text-xs">M = Mid</span>
            <span className="text-blue-500 font-mono text-xs">H = High</span>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-card border shadow-sm min-h-[140px] flex items-center justify-center overflow-x-auto">
          <div className="flex gap-1.5 pb-6 justify-center flex-wrap">
            {arr.map((val, i) => (
              <div key={i} className={cellClass(states[i] ?? "idle")}>
                {val}
                {pointerLabel(i)}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="h-10 rounded-lg border bg-background px-3 text-sm" placeholder="Array (comma separated, auto-sorted)" value={arrayInput} onChange={e => { if (running) cancelRef.current = true; setArrayInput(e.target.value); }} />
            <input className="h-10 rounded-lg border bg-background px-3 text-sm" placeholder="Target value" type="number" value={targetInput} onChange={e => { if (running) cancelRef.current = true; setTargetInput(e.target.value); }} />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input type="range" min={100} max={2000} step={50} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          <div className="flex gap-2">
            <Button onClick={start} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start Search</>}
            </Button>
            <Button variant="outline" onClick={() => { cancelRef.current = true; setArr(randomSortedArray()); setArrayInput(""); setTargetInput(""); setTarget(null); setPointers(null); }}>
              Randomize
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
