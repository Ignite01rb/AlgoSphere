import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type CellState = "idle" | "visiting" | "visited" | "found";

function randomArray(size = 15): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 10));
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function LinearSearchViz() {
  const navigate = useNavigate();
  const [arr, setArr] = useState<number[]>(() => randomArray());
  const [target, setTarget] = useState<number | null>(null);
  const [states, setStates] = useState<CellState[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [arrayInput, setArrayInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => {
    setStates(arr.map(() => "idle"));
  }, [arr]);

  const reset = useCallback(() => {
    setStates(arr.map(() => "idle"));
    setTarget(null);
  }, [arr]);

  const start = useCallback(async () => {
    if (running) { cancelRef.current = true; return; }

    let currentArr = arr;
    if (arrayInput.trim()) {
      const parsed = arrayInput.replace(/[[\]{}()]/g, "").split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
      if (parsed.length === 0) return;
      currentArr = parsed;
      setArr(parsed);
    }

    let t = target;
    if (targetInput.trim()) {
      t = Number(targetInput);
      if (isNaN(t)) return;
    } else {
      t = currentArr[Math.floor(Math.random() * currentArr.length)];
    }
    setTarget(t);

    cancelRef.current = false;
    setRunning(true);
    const s = currentArr.map(() => "idle" as CellState);
    setStates([...s]);

    for (let i = 0; i < currentArr.length; i++) {
      if (cancelRef.current) break;
      if (currentArr[i] === t) {
        s[i] = "found";
        setStates([...s]);
        break;
      }
      s[i] = "visiting";
      setStates([...s]);
      await delay(speed);
      if (cancelRef.current) break;
      s[i] = "visited";
      setStates([...s]);
    }
    setRunning(false);
  }, [arr, target, speed, arrayInput, targetInput, running]);

  const cellClass = (state: CellState) => {
    const base = "w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold border transition-all duration-300";
    switch (state) {
      case "visiting": return `${base} ring-2 ring-primary scale-110 bg-primary/20 border-primary text-primary`;
      case "visited": return `${base} opacity-40 bg-muted border-border text-muted-foreground`;
      case "found": return `${base} ring-2 ring-green-500 scale-125 bg-green-500/20 border-green-500 text-green-600 dark:text-green-400`;
      default: return `${base} bg-card border-border text-foreground`;
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Linear Search</h1>
            <p className="text-sm text-muted-foreground">Scan elements sequentially until the target is found.</p>
          </div>
        </motion.div>

        {target !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium">
            Searching for: <span className="text-primary font-bold">{target}</span>
          </motion.div>
        )}

        <div className="p-6 rounded-2xl bg-card border shadow-sm min-h-[120px] flex items-center justify-center">
          <div className="flex flex-wrap gap-2 justify-center">
            {arr.map((val, i) => (
              <motion.div key={i} layout className={cellClass(states[i] ?? "idle")}>
                {val}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="h-10 rounded-lg border bg-background px-3 text-sm" placeholder="Array (comma separated)" value={arrayInput} onChange={e => { if (running) { cancelRef.current = true; } setArrayInput(e.target.value); }} />
            <input className="h-10 rounded-lg border bg-background px-3 text-sm" placeholder="Target value" type="number" value={targetInput} onChange={e => { if (running) { cancelRef.current = true; } setTargetInput(e.target.value); }} />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input type="range" min={50} max={1500} step={50} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          <div className="flex gap-2">
            <Button onClick={start} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start Search</>}
            </Button>
            <Button variant="outline" onClick={() => { cancelRef.current = true; const a = randomArray(); setArr(a); setArrayInput(""); setTargetInput(""); reset(); }}>
              Randomize
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
