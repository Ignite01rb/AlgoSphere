import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type BarState = "idle" | "comparing" | "merging" | "sorted";

function randomArray(size = 40): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 280) + 20);
}
function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export default function MergeSortViz() {
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

    async function mergeSort(lo: number, hi: number): Promise<void> {
      if (lo >= hi || cancelRef.current) return;
      const mid = Math.floor((lo + hi) / 2);
      await mergeSort(lo, mid);
      await mergeSort(mid + 1, hi);
      if (cancelRef.current) return;
      await merge(lo, mid, hi);
    }

    async function merge(lo: number, mid: number, hi: number): Promise<void> {
      const left = a.slice(lo, mid + 1);
      const right = a.slice(mid + 1, hi + 1);
      let i = 0, j = 0, k = lo;
      while (i < left.length && j < right.length) {
        if (cancelRef.current) return;
        for (let x = lo; x <= hi; x++) s[x] = "comparing";
        setStates([...s]);
        await delay(speed);
        if (left[i] <= right[j]) { a[k] = left[i]; i++; }
        else { a[k] = right[j]; j++; }
        s[k] = "merging";
        setArr([...a]);
        setStates([...s]);
        await delay(speed);
        k++;
      }
      while (i < left.length) { if (cancelRef.current) return; a[k] = left[i]; s[k] = "merging"; setArr([...a]); setStates([...s]); await delay(speed); i++; k++; }
      while (j < right.length) { if (cancelRef.current) return; a[k] = right[j]; s[k] = "merging"; setArr([...a]); setStates([...s]); await delay(speed); j++; k++; }
      for (let x = lo; x <= hi; x++) s[x] = "idle";
      setStates([...s]);
    }

    await mergeSort(0, a.length - 1);
    if (!cancelRef.current) { setStates(a.map(() => "sorted")); }
    setRunning(false);
  }, [arr, running, speed]);

  const barColor = (state: BarState) => {
    switch (state) { case "comparing": return "bg-blue-400"; case "merging": return "bg-amber-400"; case "sorted": return "bg-green-500"; default: return "bg-primary/30"; }
  };
  const maxVal = Math.max(...arr, 1);

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Merge Sort</h1>
            <p className="text-sm text-muted-foreground">Divide and conquer — split, sort halves, merge back together.</p>
          </div>
        </motion.div>
        <div className="p-4 rounded-2xl bg-card border shadow-sm" style={{ minHeight: 320 }}>
          <div className="flex items-end gap-[2px] h-[280px]">
            {arr.map((val, i) => (
              <div key={i} className={`flex-1 min-w-[3px] max-w-[20px] rounded-t-sm transition-all duration-100 ${barColor(states[i] ?? "idle")}`} style={{ height: `${(val / maxVal) * 100}%` }} />
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
