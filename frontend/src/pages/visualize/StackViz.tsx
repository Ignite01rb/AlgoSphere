import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Minus, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface StackItem {
  id: number;
  value: string;
}

let nextId = 0;

export default function StackViz() {
  const navigate = useNavigate();
  const [stack, setStack] = useState<StackItem[]>([]);
  const [input, setInput] = useState("");
  const [peekId, setPeekId] = useState<number | null>(null);

  const push = useCallback(() => {
    if (!input.trim()) return;
    setStack(prev => [...prev, { id: ++nextId, value: input.trim() }]);
    setInput("");
  }, [input]);

  const pop = useCallback(() => {
    setStack(prev => prev.slice(0, -1));
  }, []);

  const peek = useCallback(() => {
    if (stack.length === 0) return;
    const topId = stack[stack.length - 1].id;
    setPeekId(topId);
    setTimeout(() => setPeekId(null), 1200);
  }, [stack]);

  const clear = useCallback(() => { setStack([]); }, []);

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Stack</h1>
            <p className="text-sm text-muted-foreground">Last-in, first-out data structure.</p>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Stack visualization */}
          <div className="flex-1 p-6 rounded-2xl bg-card border shadow-sm">
            <div className="flex flex-col-reverse items-center gap-2 min-h-[320px] justify-start border-2 border-dashed border-border/60 rounded-xl p-4 relative">
              <AnimatePresence mode="popLayout">
                {stack.length === 0 && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-lg font-bold tracking-widest">
                    EMPTY
                  </motion.div>
                )}
                {stack.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -30, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-full max-w-[200px] h-12 rounded-lg border flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      item.id === peekId
                        ? "ring-2 ring-primary bg-primary/20 border-primary text-primary scale-105"
                        : i === stack.length - 1
                        ? "bg-secondary border-border text-foreground"
                        : "bg-card border-border text-foreground"
                    }`}
                  >
                    {item.value}
                    {i === stack.length - 1 && (
                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">← TOP</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full md:w-64 p-4 rounded-2xl bg-card border shadow-sm space-y-3">
            <form onSubmit={e => { e.preventDefault(); push(); }} className="flex gap-2">
              <input className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm" placeholder="Value" value={input} onChange={e => setInput(e.target.value)} />
              <Button type="submit" size="icon" className="shrink-0"><Plus className="w-4 h-4" /></Button>
            </form>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={pop} disabled={stack.length === 0} className="gap-1"><Minus className="w-3 h-3" /> Pop</Button>
              <Button variant="outline" size="sm" onClick={peek} disabled={stack.length === 0} className="gap-1"><Eye className="w-3 h-3" /> Peek</Button>
              <Button variant="outline" size="sm" onClick={clear} disabled={stack.length === 0} className="gap-1"><Trash2 className="w-3 h-3" /> Clear</Button>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Size: <span className="font-bold text-foreground">{stack.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
