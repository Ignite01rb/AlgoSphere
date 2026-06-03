import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Minus, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface QueueItem { id: number; value: string; }
let nextId = 0;

export default function QueueViz() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [input, setInput] = useState("");
  const [peekId, setPeekId] = useState<number | null>(null);

  const enqueue = useCallback(() => {
    if (!input.trim()) return;
    setQueue(prev => [...prev, { id: ++nextId, value: input.trim() }]);
    setInput("");
  }, [input]);

  const dequeue = useCallback(() => { setQueue(prev => prev.slice(1)); }, []);

  const peek = useCallback(() => {
    if (queue.length === 0) return;
    setPeekId(queue[0].id);
    setTimeout(() => setPeekId(null), 1200);
  }, [queue]);

  const clear = useCallback(() => { setQueue([]); }, []);

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Queue</h1>
            <p className="text-sm text-muted-foreground">First-in, first-out data structure.</p>
          </div>
        </motion.div>

        <div className="p-6 rounded-2xl bg-card border shadow-sm min-h-[180px]">
          <div className="flex items-center min-h-[100px] gap-0 overflow-x-auto py-4">
            {queue.length === 0 ? (
              <div className="text-muted-foreground/40 text-lg font-bold tracking-widest mx-auto">EMPTY</div>
            ) : (
              <>
                <div className="flex flex-col items-center mr-2 shrink-0">
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Front</span>
                  <ArrowRight className="w-4 h-4 text-green-500" />
                </div>
                <AnimatePresence mode="popLayout">
                  {queue.map((item, i) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.5, x: 30 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: -30 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`h-14 min-w-[56px] px-4 rounded-lg border flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-300 ${
                        item.id === peekId
                          ? "ring-2 ring-primary bg-primary/20 border-primary text-primary scale-105"
                          : "bg-card border-border text-foreground"
                      } ${i < queue.length - 1 ? "mr-2" : ""}`}
                    >
                      {item.value}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="flex flex-col items-center ml-2 shrink-0">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Back</span>
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-3">
          <form onSubmit={e => { e.preventDefault(); enqueue(); }} className="flex gap-2">
            <input className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm" placeholder="Value" value={input} onChange={e => setInput(e.target.value)} />
            <Button type="submit" size="sm" className="gap-1"><Plus className="w-4 h-4" /> Enqueue</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={dequeue} disabled={queue.length === 0} className="gap-1"><Minus className="w-3 h-3" /> Dequeue</Button>
            <Button variant="outline" size="sm" onClick={peek} disabled={queue.length === 0} className="gap-1"><Eye className="w-3 h-3" /> Peek</Button>
            <Button variant="outline" size="sm" onClick={clear} disabled={queue.length === 0} className="gap-1"><Trash2 className="w-3 h-3" /> Clear</Button>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">Size: <span className="font-bold text-foreground">{queue.length}</span></div>
        </div>
      </div>
    </div>
  );
}
