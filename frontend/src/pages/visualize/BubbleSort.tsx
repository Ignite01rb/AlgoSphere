import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type BarState = "idle" | "comparing" | "swapping" | "sorted";

function randomArray(size = 40): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 280) + 20);
}
function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export default function BubbleSortViz() {
  const navigate = useNavigate();
  const [arr, setArr] = useState<number[]>(() => randomArray());
  const [states, setStates] = useState<BarState[]>(() => arr.map(() => "idle"));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(20);
  const [comparisons, setComparisons] = useState(0);
  const cancelRef = useRef(false);

  const start = useCallback(async () => {
    if (running) { cancelRef.current = true; return; }
    cancelRef.current = false;
    setRunning(true);
    setComparisons(0);
    const a = [...arr];
    const s = a.map(() => "idle" as BarState);
    let comps = 0;

    for (let i = 0; i < a.length - 1; i++) {
      for (let j = 0; j < a.length - i - 1; j++) {
        if (cancelRef.current) break;
        s[j] = "comparing"; s[j + 1] = "comparing";
        setStates([...s]);
        comps++;
        setComparisons(comps);
        await delay(speed);
        if (cancelRef.current) break;
        if (a[j] > a[j + 1]) {
          s[j] = "swapping"; s[j + 1] = "swapping";
          setStates([...s]);
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          setArr([...a]);
          await delay(speed);
        }
        s[j] = "idle"; s[j + 1] = "idle";
      }
      if (cancelRef.current) break;
      s[a.length - 1 - i] = "sorted";
      setStates([...s]);
    }
    if (!cancelRef.current) { s[0] = "sorted"; setStates([...s]); }
    setRunning(false);
  }, [arr, running, speed]);

  const barColor = (state: BarState) => {
    switch (state) {
      case "comparing": return "bg-primary";
      case "swapping": return "bg-amber-400";
      case "sorted": return "bg-green-500";
      default: return "bg-primary/30";
    }
  };

  const maxVal = Math.max(...arr, 1);

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bubble Sort</h1>
            <p className="text-sm text-muted-foreground">Repeatedly swap adjacent elements if they are in the wrong order.</p>
          </div>
        </motion.div>

        {comparisons > 0 && (
          <div className="text-sm text-muted-foreground">Comparisons: <span className="font-bold text-foreground">{comparisons}</span></div>
        )}

        <div className="p-4 rounded-2xl bg-card border shadow-sm" style={{ minHeight: 320 }}>
          <div className="flex items-end gap-[2px] h-[280px]">
            {arr.map((val, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[3px] max-w-[20px] rounded-t-sm transition-all duration-100 ${barColor(states[i] ?? "idle")}`}
                style={{ height: `${(val / maxVal) * 100}%` }}
              />
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input type="range" min={1} max={100} step={1} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          <div className="flex gap-2">
            <Button onClick={start} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Sort</>}
            </Button>
            <Button variant="outline" onClick={() => { cancelRef.current = true; const a = randomArray(); setArr(a); setStates(a.map(() => "idle")); setComparisons(0); }} className="gap-2">
              <Shuffle className="w-4 h-4" /> Randomize
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
