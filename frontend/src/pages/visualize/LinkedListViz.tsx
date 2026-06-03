import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Minus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface LLNode {
  id: number;
  value: string;
}

let nodeId = 0;

export default function LinkedListViz() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<LLNode[]>([]);
  const [input, setInput] = useState("");

  const insertHead = useCallback(() => {
    if (!input.trim()) return;
    setNodes(prev => [{ id: ++nodeId, value: input.trim() }, ...prev]);
    setInput("");
  }, [input]);

  const insertTail = useCallback(() => {
    if (!input.trim()) return;
    setNodes(prev => [...prev, { id: ++nodeId, value: input.trim() }]);
    setInput("");
  }, [input]);

  const deleteHead = useCallback(() => {
    setNodes(prev => prev.slice(1));
  }, []);

  const deleteTail = useCallback(() => {
    setNodes(prev => prev.slice(0, -1));
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Linked List</h1>
            <p className="text-sm text-muted-foreground">Dynamic nodes connected by pointers.</p>
          </div>
        </motion.div>

        <div className="p-6 rounded-2xl bg-card border shadow-sm min-h-[200px] overflow-x-auto">
          <div className="flex items-center gap-0 min-h-[100px] py-4">
            {nodes.length === 0 ? (
              <div className="text-muted-foreground/40 text-lg font-bold tracking-widest mx-auto">EMPTY LIST</div>
            ) : (
              <>
                <span className="text-xs font-bold text-primary mr-2 shrink-0">HEAD</span>
                <AnimatePresence mode="popLayout">
                  {nodes.map((node, i) => (
                    <motion.div
                      key={node.id}
                      layout
                      initial={{ opacity: 0, scale: 0.5, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: -20 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="flex items-center shrink-0"
                    >
                      <div className="flex border rounded-lg overflow-hidden">
                        <div className="w-14 h-14 flex items-center justify-center font-bold text-sm bg-card border-r">
                          {node.value}
                        </div>
                        <div className="w-8 h-14 flex items-center justify-center bg-secondary/50">
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      {i < nodes.length - 1 && (
                        <div className="w-8 h-0.5 bg-primary/40 shrink-0" />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <motion.div layout className="ml-1 text-xs font-mono text-muted-foreground shrink-0 border border-dashed rounded px-2 py-1">
                  NULL
                </motion.div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-3">
          <form onSubmit={e => { e.preventDefault(); insertTail(); }} className="flex gap-2">
            <input className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm" placeholder="Node value" value={input} onChange={e => setInput(e.target.value)} />
          </form>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={insertHead} disabled={!input.trim()} className="gap-1"><Plus className="w-3 h-3" /> Insert Head</Button>
            <Button size="sm" onClick={insertTail} disabled={!input.trim()} className="gap-1"><Plus className="w-3 h-3" /> Insert Tail</Button>
            <Button variant="outline" size="sm" onClick={deleteHead} disabled={nodes.length === 0} className="gap-1"><Minus className="w-3 h-3" /> Delete Head</Button>
            <Button variant="outline" size="sm" onClick={deleteTail} disabled={nodes.length === 0} className="gap-1"><Minus className="w-3 h-3" /> Delete Tail</Button>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Length: <span className="font-bold text-foreground">{nodes.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
