import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type CellType = "empty" | "wall" | "source" | "target" | "open" | "closed" | "path";

const CELL_SIZE = 36;
const ROWS = 14;
const COLS = 22;

interface AStarNode {
  r: number;
  c: number;
  g: number;
  h: number;
  f: number;
  parentKey: string | null;
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function initGrid(): CellType[][] {
  const grid: CellType[][] = Array.from({ length: ROWS }, () => Array(COLS).fill("empty"));
  // Place source and target
  grid[Math.floor(ROWS / 2)][2] = "source";
  grid[Math.floor(ROWS / 2)][COLS - 3] = "target";
  return grid;
}

function findCell(grid: CellType[][], type: CellType): [number, number] | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === type) return [r, c];
    }
  }
  return null;
}

export default function AStarGridViz() {
  const navigate = useNavigate();
  const [grid, setGrid] = useState<CellType[][]>(() => initGrid());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [pathLength, setPathLength] = useState<number | null>(null);
  const cancelRef = useRef(false);
  const draggingRef = useRef(false);

  const resetVisited = useCallback(() => {
    setGrid((prev) =>
      prev.map((row) =>
        row.map((c) => (c === "open" || c === "closed" || c === "path" ? "empty" : c))
      )
    );
    setPathLength(null);
  }, []);

  const resetAll = useCallback(() => {
    setGrid(initGrid());
    setPathLength(null);
    cancelRef.current = true;
  }, []);

  const toggleWall = useCallback((r: number, c: number) => {
    setGrid((prev) => {
      if (prev[r][c] === "source" || prev[r][c] === "target") return prev;
      const next = prev.map((row) => [...row]);
      next[r][c] = next[r][c] === "wall" ? "empty" : "wall";
      return next;
    });
  }, []);

  const startAStar = useCallback(async () => {
    if (running) {
      cancelRef.current = true;
      return;
    }
    resetVisited();
    cancelRef.current = false;
    setRunning(true);

    const g = grid.map((row) => [...row]);
    const src = findCell(g, "source");
    const tgt = findCell(g, "target");
    if (!src || !tgt) {
      setRunning(false);
      return;
    }

    const manhattan = (r1: number, c1: number, r2: number, c2: number) => {
      return Math.abs(r1 - r2) + Math.abs(c1 - c2);
    };

    const openSet: AStarNode[] = [
      {
        r: src[0],
        c: src[1],
        g: 0,
        h: manhattan(src[0], src[1], tgt[0], tgt[1]),
        f: manhattan(src[0], src[1], tgt[0], tgt[1]),
        parentKey: null,
      },
    ];

    const closedSet = new Map<string, AStarNode>();
    const openSetMap = new Map<string, AStarNode>();
    openSetMap.set(`${src[0]},${src[1]}`, openSet[0]);

    const dirs = [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ];
    let foundNode: AStarNode | null = null;

    while (openSet.length > 0) {
      if (cancelRef.current) break;

      // Sort openSet by f value, and then by h value (heuristic tie-breaker)
      openSet.sort((a, b) => {
        if (a.f === b.f) return a.h - b.h;
        return a.f - b.f;
      });

      const current = openSet.shift()!;
      const key = `${current.r},${current.c}`;
      openSetMap.delete(key);
      closedSet.set(key, current);

      if (current.r === tgt[0] && current.c === tgt[1]) {
        foundNode = current;
        break;
      }

      if (!(current.r === src[0] && current.c === src[1])) {
        g[current.r][current.c] = "closed";
      }

      for (const [dr, dc] of dirs) {
        const nr = current.r + dr;
        const nc = current.c + dc;

        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (g[nr][nc] === "wall") continue;

        const neighborKey = `${nr},${nc}`;
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + 1;

        let neighborNode = openSetMap.get(neighborKey);
        if (!neighborNode) {
          const h = manhattan(nr, nc, tgt[0], tgt[1]);
          neighborNode = {
            r: nr,
            c: nc,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parentKey: key,
          };
          openSet.push(neighborNode);
          openSetMap.set(neighborKey, neighborNode);

          if (!(nr === tgt[0] && nc === tgt[1])) {
            g[nr][nc] = "open";
          }
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = tentativeG + neighborNode.h;
          neighborNode.parentKey = key;
        }
      }

      setGrid(g.map((row) => [...row]));
      await delay(speed);
    }

    // Trace path
    if (foundNode && !cancelRef.current) {
      let curr = foundNode;
      let len = 1;
      while (curr.parentKey) {
        const parentNode = closedSet.get(curr.parentKey);
        if (!parentNode) break;
        if (parentNode.r === src[0] && parentNode.c === src[1]) break;
        g[parentNode.r][parentNode.c] = "path";
        len++;
        curr = parentNode;
        setGrid(g.map((row) => [...row]));
        await delay(speed);
        if (cancelRef.current) break;
      }
      setPathLength(len);
    }

    setRunning(false);
  }, [grid, running, speed, resetVisited]);

  const cellColor = (type: CellType) => {
    switch (type) {
      case "wall":
        return "bg-foreground/80 dark:bg-foreground/60";
      case "source":
        return "bg-green-500";
      case "target":
        return "bg-red-500";
      case "open":
        return "bg-cyan-400/40 dark:bg-cyan-500/30";
      case "closed":
        return "bg-blue-400/50 dark:bg-blue-500/40";
      case "path":
        return "bg-amber-400 dark:bg-amber-500";
      default:
        return "bg-card hover:bg-secondary/80";
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">A* Pathfinder</h1>
            <p className="text-sm text-muted-foreground">
              Find shortest paths using Manhattan distance heuristics to guide the search grid.
            </p>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-4 text-xs bg-card p-3 rounded-xl border">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Source
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Target
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-foreground/80 dark:bg-foreground/60 inline-block" /> Wall
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-400/40 inline-block" /> Open Set
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-400/50 inline-block" /> Closed Set
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Path
          </span>
          {pathLength !== null && <span className="ml-auto font-bold text-primary">Shortest Path: {pathLength}</span>}
        </div>

        <div
          className="p-3 rounded-2xl bg-card border shadow-sm overflow-x-auto select-none"
          onMouseDown={() => {
            draggingRef.current = true;
          }}
          onMouseUp={() => {
            draggingRef.current = false;
          }}
          onMouseLeave={() => {
            draggingRef.current = false;
          }}
        >
          <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)` }}>
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`transition-colors duration-150 rounded-sm border border-border/30 cursor-pointer ${cellColor(cell)}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  onMouseDown={() => toggleWall(r, c)}
                  onMouseEnter={() => {
                    if (draggingRef.current) toggleWall(r, c);
                  }}
                >
                  {cell === "source" && <span className="flex items-center justify-center h-full text-white text-xs font-bold font-mono">S</span>}
                  {cell === "target" && <span className="flex items-center justify-center h-full text-white text-xs font-bold font-mono">T</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Speed: {speed}ms</label>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="flex-1 max-w-xs accent-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={startAStar} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? (
                <>
                  <Square className="w-4 h-4" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start A*
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetVisited} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Clear Path
            </Button>
            <Button variant="outline" onClick={resetAll}>
              Reset Grid
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Click or drag on the grid to draw obstacle walls. A* uses Manhattan distance heuristics to find the shortest path.
          </p>
        </div>
      </div>
    </div>
  );
}
