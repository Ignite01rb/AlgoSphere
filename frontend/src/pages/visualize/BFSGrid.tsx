import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type CellType = "empty" | "wall" | "source" | "target" | "visited" | "path";

const CELL_SIZE = 36;
const ROWS = 14;
const COLS = 22;

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

function initGrid(): CellType[][] {
  const grid: CellType[][] = Array.from({ length: ROWS }, () => Array(COLS).fill("empty"));
  // Place source and target
  grid[Math.floor(ROWS / 2)][2] = "source";
  grid[Math.floor(ROWS / 2)][COLS - 3] = "target";
  return grid;
}

function findCell(grid: CellType[][], type: CellType): [number, number] | null {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] === type) return [r, c];
  return null;
}

export default function BFSGridViz() {
  const navigate = useNavigate();
  const [grid, setGrid] = useState<CellType[][]>(() => initGrid());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [pathLength, setPathLength] = useState<number | null>(null);
  const cancelRef = useRef(false);
  const draggingRef = useRef(false);

  const resetVisited = useCallback(() => {
    setGrid(prev => prev.map(row => row.map(c => (c === "visited" || c === "path") ? "empty" : c)));
    setPathLength(null);
  }, []);

  const resetAll = useCallback(() => {
    setGrid(initGrid());
    setPathLength(null);
    cancelRef.current = true;
  }, []);

  const toggleWall = useCallback((r: number, c: number) => {
    setGrid(prev => {
      if (prev[r][c] === "source" || prev[r][c] === "target") return prev;
      const next = prev.map(row => [...row]);
      next[r][c] = next[r][c] === "wall" ? "empty" : "wall";
      return next;
    });
  }, []);

  const startBFS = useCallback(async () => {
    if (running) { cancelRef.current = true; return; }
    resetVisited();
    cancelRef.current = false;
    setRunning(true);

    // Work on a snapshot
    const g = grid.map(row => [...row]);
    const src = findCell(g, "source");
    const tgt = findCell(g, "target");
    if (!src || !tgt) { setRunning(false); return; }

    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: [number, number][] = [src];
    visited.add(`${src[0]},${src[1]}`);
    const dirs = [[0,1],[1,0],[-1,0],[0,-1]];
    let found = false;

    outer: while (queue.length > 0) {
      if (cancelRef.current) break;
      const levelSize = queue.length;
      for (let i = 0; i < levelSize; i++) {
        const [r, c] = queue.shift()!;
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          const key = `${nr},${nc}`;
          if (visited.has(key) || g[nr][nc] === "wall") continue;
          visited.add(key);
          parent.set(key, `${r},${c}`);
          if (nr === tgt[0] && nc === tgt[1]) { found = true; break outer; }
          queue.push([nr, nc]);
          g[nr][nc] = "visited";
          setGrid(g.map(row => [...row]));
        }
      }
      await delay(speed);
    }

    // Trace path
    if (found && !cancelRef.current) {
      let key = `${tgt[0]},${tgt[1]}`;
      let len = 1;
      while (parent.has(key)) {
        key = parent.get(key)!;
        const [pr, pc] = key.split(",").map(Number);
        if (pr === src[0] && pc === src[1]) break;
        g[pr][pc] = "path";
        len++;
        setGrid(g.map(row => [...row]));
        await delay(speed);
        if (cancelRef.current) break;
      }
      setPathLength(len);
    }
    setRunning(false);
  }, [grid, running, speed, resetVisited]);

  const cellColor = (type: CellType) => {
    switch (type) {
      case "wall": return "bg-foreground/80 dark:bg-foreground/60";
      case "source": return "bg-green-500";
      case "target": return "bg-red-500";
      case "visited": return "bg-blue-400/50 dark:bg-blue-500/40";
      case "path": return "bg-amber-400 dark:bg-amber-500";
      default: return "bg-card hover:bg-secondary/80";
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BFS Pathfinder</h1>
            <p className="text-sm text-muted-foreground">Find the shortest path on a grid using breadth-first search.</p>
          </div>
        </motion.div>

        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Source</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Target</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-foreground/80 dark:bg-foreground/60 inline-block" /> Wall</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400/50 inline-block" /> Visited</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Path</span>
          {pathLength !== null && <span className="ml-auto font-bold">Shortest Path: {pathLength}</span>}
        </div>

        <div className="p-3 rounded-2xl bg-card border shadow-sm overflow-x-auto select-none"
          onMouseDown={() => { draggingRef.current = true; }}
          onMouseUp={() => { draggingRef.current = false; }}
          onMouseLeave={() => { draggingRef.current = false; }}
        >
          <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)` }}>
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`transition-colors duration-150 rounded-sm border border-border/30 cursor-pointer ${cellColor(cell)}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  onMouseDown={() => toggleWall(r, c)}
                  onMouseEnter={() => { if (draggingRef.current) toggleWall(r, c); }}
                >
                  {cell === "source" && <span className="flex items-center justify-center h-full text-white text-xs font-bold">S</span>}
                  {cell === "target" && <span className="flex items-center justify-center h-full text-white text-xs font-bold">T</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input type="range" min={10} max={200} step={10} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={startBFS} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start BFS</>}
            </Button>
            <Button variant="outline" onClick={resetVisited} className="gap-2"><RotateCcw className="w-4 h-4" /> Clear Path</Button>
            <Button variant="outline" onClick={resetAll}>Reset Grid</Button>
          </div>
          <p className="text-xs text-muted-foreground">Click or drag on the grid to place walls. Then start BFS to find the shortest path.</p>
        </div>
      </div>
    </div>
  );
}
