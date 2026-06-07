import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type CellState = "empty" | "queen" | "checking" | "backtrack" | "success";

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function NQueensViz() {
  const navigate = useNavigate();
  const [boardSize, setBoardSize] = useState(6);
  const [grid, setGrid] = useState<CellState[][]>(() =>
    Array.from({ length: 6 }, () => Array(6).fill("empty"))
  );
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(200);
  const [statusText, setStatusText] = useState("Idle");
  const cancelRef = useRef(false);

  const initGrid = (size: number): CellState[][] => {
    return Array.from({ length: size }, () => Array(size).fill("empty"));
  };

  const handleSizeChange = (size: number) => {
    if (running) return;
    setBoardSize(size);
    setGrid(initGrid(size));
    setStatusText(`Grid resized to ${size}x${size}.`);
  };

  const isSafe = (board: number[], row: number, col: number): boolean => {
    for (let i = 0; i < row; i++) {
      if (board[i] === col || board[i] - i === col - row || board[i] + i === col + row) {
        return false;
      }
    }
    return true;
  };

  const runBacktracking = useCallback(async () => {
    if (running) {
      cancelRef.current = true;
      return;
    }
    cancelRef.current = false;
    setRunning(true);
    setStatusText("Solving...");

    const n = boardSize;
    const board = Array(n).fill(-1);
    const visualGrid = initGrid(n);
    setGrid(visualGrid.map((row) => [...row]));

    const solve = async (row: number): Promise<boolean> => {
      if (row === n) {
        setStatusText("Solution found!");
        // Highlight success
        for (let r = 0; r < n; r++) {
          visualGrid[r][board[r]] = "success";
        }
        setGrid(visualGrid.map((r) => [...r]));
        return true;
      }

      for (let col = 0; col < n; col++) {
        if (cancelRef.current) return false;

        // Visual check
        visualGrid[row][col] = "checking";
        setGrid(visualGrid.map((r) => [...r]));
        setStatusText(`Checking Row ${row + 1}, Col ${col + 1}...`);
        await delay(speed);

        if (isSafe(board, row, col)) {
          board[row] = col;
          visualGrid[row][col] = "queen";
          setGrid(visualGrid.map((r) => [...r]));
          setStatusText(`Placed Queen at Row ${row + 1}, Col ${col + 1}.`);
          await delay(speed);

          const result = await solve(row + 1);
          if (result) return true;

          // Backtrack
          if (cancelRef.current) return false;
          board[row] = -1;
          visualGrid[row][col] = "backtrack";
          setGrid(visualGrid.map((r) => [...r]));
          setStatusText(`Backtracking: Removing Queen from Row ${row + 1}, Col ${col + 1}.`);
          await delay(speed);
        }

        visualGrid[row][col] = "empty";
        setGrid(visualGrid.map((r) => [...r]));
      }

      return false;
    };

    const hasSolution = await solve(0);
    if (!hasSolution && !cancelRef.current) {
      setStatusText(`No solution exists for ${n}x${n} board.`);
    }
    setRunning(false);
  }, [boardSize, running, speed]);

  const cellBg = (cell: CellState, r: number, c: number) => {
    if (cell === "queen") return "bg-primary text-white border-primary";
    if (cell === "success") return "bg-emerald-500 text-white border-emerald-500";
    if (cell === "checking") return "bg-cyan-400/40 dark:bg-cyan-500/30 border-cyan-400";
    if (cell === "backtrack") return "bg-rose-500/30 dark:bg-rose-500/20 border-rose-500";

    // Checkerboard pattern
    const isDark = (r + c) % 2 === 1;
    return isDark
      ? "bg-secondary/40 hover:bg-secondary/80 border-border/20"
      : "bg-card hover:bg-secondary/80 border-border/20";
  };

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visualize")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">N-Queens Backtracking</h1>
            <p className="text-sm text-muted-foreground">Visualize row-by-row backtracking exploration of the N-Queens puzzle.</p>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between text-xs bg-card p-3 rounded-xl border">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-primary inline-block" /> Placed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-cyan-400/50 inline-block" /> Checking
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-rose-500/30 inline-block" /> Backtrack
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" /> Solved
            </span>
          </div>
          <span className="font-semibold text-muted-foreground">
            Status: <span className="font-mono text-primary font-bold">{statusText}</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-center overflow-x-auto">
          <div
            className="inline-grid gap-1.5 p-3 rounded-xl border bg-card/50"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, 48px)`,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`w-12 h-12 rounded-lg border flex items-center justify-center text-lg font-bold font-mono transition-all duration-200 select-none ${cellBg(
                    cell,
                    r,
                    c
                  )}`}
                >
                  {(cell === "queen" || cell === "success") && "♛"}
                  {cell === "checking" && "?"}
                  {cell === "backtrack" && "✕"}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Board Size:</span>
              {[4, 5, 6, 7, 8].map((size) => (
                <Button
                  key={size}
                  size="sm"
                  variant={boardSize === size ? "default" : "outline"}
                  onClick={() => handleSizeChange(size)}
                  disabled={running}
                >
                  {size}x{size}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-1">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Step Speed: {speed}ms</label>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="flex-1 max-w-xs accent-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button onClick={runBacktracking} variant={running ? "destructive" : "default"} className="gap-2">
              {running ? (
                <>
                  <Square className="w-4 h-4" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Solve Chessboard
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                cancelRef.current = true;
                setGrid(initGrid(boardSize));
                setStatusText("Reset complete.");
              }}
              disabled={running}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset Grid
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
