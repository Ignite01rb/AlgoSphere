import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type BarState = "idle" | "pivot" | "comparing" | "swapping" | "sorted";

function randomArray(size = 40): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 280) + 20);
}
function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export default function QuickSortViz() {
  const navigate = useNavigate();
  const [arr, setArr] = useState<number[]>(() => randomArray());
  const [states, setStates] = useState<BarState[]>(() => arr.map(() => "idle"));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(30);
  const cancelRef = useRef(false);

  const start = useCallback(async () => {
    if (running) { cancelRef.current = true; return; }
    cancelRef.current = false;
    setRunning(true);
    const a = [...arr];
    const s = a.map(() => "idle" as BarState);

    async function quickSort(lo: number, hi: number): Promise<void> {
      if (lo >= hi || cancelRef.current) return;
      const pivotIdx = await partition(lo, hi);
      if (cancelRef.current) return;
      s[pivotIdx] = "sorted";
      setStates([...s]);
      await quickSort(lo, pivotIdx - 1);
      await quickSort(pivotIdx + 1, hi);
    }

    async function partition(lo: number, hi: number): Promise<number> {
      const pivot = a[hi];
      s[hi] = "pivot";
      setStates([...s]);
      let i = lo - 1;
      for (let j = lo; j < hi; j++) {
        if (cancelRef.current) return lo;
        s[j] = "comparing";
        setStates([...s]);
        await delay(speed);
        if (a[j] < pivot) {
          i++;
          s[i] = "swapping"; s[j] = "swapping";
          setStates([...s]);
          [a[i], a[j]] = [a[j], a[i]];
          setArr([...a]);
          await delay(speed);
        }
        if (s[j] !== "sorted") s[j] = "idle";
        if (i >= lo && s[i] !== "sorted") s[i] = "idle";
        setStates([...s]);
      }
      [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
      setArr([...a]);
      s[hi] = "idle";
      for (let x = lo; x <= hi; x++) if (s[x] !== "sorted") s[x] = "idle";
      setStates([...s]);
      return i + 1;
    }

    await quickSort(0, a.length - 1);
    if (!cancelRef.current) setStates(a.map(() => "sorted"));
    setRunning(false);
  }, [arr, running, speed]);

  const barColor = (state: BarState) => {
    switch (state) { case "pivot": return "bg-rose-500"; case "comparing": return "bg-primary"; case "swapping": return "bg-amber-400"; case "sorted": return "bg-green-500"; default: return "bg-primary/30"; }
  };
  const maxVal = Math.max(...arr, 1);

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Quick Sort</h1>
            <p className="text-sm text-muted-foreground">Partition around a pivot, recursively sort sub-arrays.</p>
          </div>
        </motion.div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Pivot</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Comparing</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Swapping</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Sorted</span>
        </div>
        <div className="p-4 rounded-2xl bg-card border shadow-sm" style={{ minHeight: 320 }}>
          <div className="flex items-end gap-[2px] h-[280px]">
            {arr.map((val, i) => (
              <div key={i} className={`flex-1 min-w-[3px] max-w-[20px] rounded-t-sm transition-all duration-75 ${barColor(states[i] ?? "idle")}`} style={{ height: `${(val / maxVal) * 100}%` }} />
            ))}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input type="range" min={1} max={150} step={5} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          <div className="flex gap-2">
            <Button onClick={start} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Sort</>}
            </Button>
            <Button variant="outline" onClick={() => { cancelRef.current = true; const a = randomArray(); setArr(a); setStates(a.map(() => "idle")); }} className="gap-2">
              <Shuffle className="w-4 h-4" /> Randomize
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
