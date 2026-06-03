import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Download, Copy, Play, Trash2, ChevronUp, ChevronDown,
  Hash, Percent, BarChart3, Type, Shuffle, Grid3X3, Network, GitBranch,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ═══════════════════════ Types ═══════════════════════ */

type FieldType =
  | "integer"
  | "float"
  | "integer_array"
  | "string"
  | "permutation"
  | "matrix"
  | "graph"
  | "tree";

interface FieldConfig {
  id: string;
  type: FieldType;
  label: string;
  sameLine: boolean;
  // integer / float
  min: number;
  max: number;
  precision: number;
  // array-like size
  sizeType: "range" | "ref";
  sizeMin: number;
  sizeMax: number;
  sizeRef: string;
  // int-array values
  valueMin: number;
  valueMax: number;
  distinct: boolean;
  sorted: "none" | "asc" | "desc";
  // string
  charset: "lowercase" | "uppercase" | "alphanumeric" | "digits" | "binary" | "custom";
  customChars: string;
  // matrix
  rowsType: "range" | "ref";
  rowsMin: number;
  rowsMax: number;
  rowsRef: string;
  colsType: "range" | "ref";
  colsMin: number;
  colsMax: number;
  colsRef: string;
  // graph / tree
  nodesRef: string;
  edgesType: "range" | "ref";
  edgesMin: number;
  edgesMax: number;
  edgesRef: string;
  directed: boolean;
  weighted: boolean;
  weightMin: number;
  weightMax: number;
  connected: boolean;
  selfLoops: boolean;
}

/* ═══════════════════════ Constants ═══════════════════════ */

const FIELD_META: {
  type: FieldType;
  label: string;
  icon: typeof Hash;
  desc: string;
  color: string;
}[] = [
  { type: "integer", label: "Integer", icon: Hash, desc: "Single number", color: "text-blue-500" },
  { type: "float", label: "Float", icon: Percent, desc: "Decimal number", color: "text-amber-500" },
  { type: "integer_array", label: "Int Array", icon: BarChart3, desc: "Space-separated ints", color: "text-emerald-500" },
  { type: "string", label: "String", icon: Type, desc: "Characters", color: "text-purple-500" },
  { type: "permutation", label: "Permutation", icon: Shuffle, desc: "Perm of 1…N", color: "text-pink-500" },
  { type: "matrix", label: "Matrix", icon: Grid3X3, desc: "2D int grid", color: "text-cyan-500" },
  { type: "graph", label: "Graph", icon: Network, desc: "Edge list", color: "text-orange-500" },
  { type: "tree", label: "Tree", icon: GitBranch, desc: "Tree edges", color: "text-teal-500" },
];

const CHARSETS: Record<string, string> = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  alphanumeric: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  digits: "0123456789",
  binary: "01",
};

const INT_LABELS = ["N", "M", "K", "Q", "X", "Y", "Z", "A", "B"];
const DEFAULT_LABELS: Record<FieldType, string> = {
  integer: "N",
  float: "X",
  integer_array: "arr",
  string: "s",
  permutation: "perm",
  matrix: "grid",
  graph: "edges",
  tree: "tree",
};

const MULTI_LINE_TYPES = new Set<FieldType>(["matrix", "graph", "tree"]);

/* ═══════════════════════ Generator Utils ═══════════════════════ */

function randInt(lo: number, hi: number): number {
  if (lo > hi) [lo, hi] = [hi, lo];
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function randFloat(lo: number, hi: number, p: number): number {
  return Number((Math.random() * (hi - lo) + lo).toFixed(p));
}

function fisherShuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function genIntArray(len: number, lo: number, hi: number, distinct: boolean): number[] {
  if (len <= 0) return [];
  if (distinct && hi - lo + 1 >= len) {
    if (hi - lo + 1 <= len * 4) {
      const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
      return fisherShuffle(pool).slice(0, len);
    }
    const s = new Set<number>();
    while (s.size < len) s.add(randInt(lo, hi));
    return [...s];
  }
  return Array.from({ length: len }, () => randInt(lo, hi));
}

function genPermutation(n: number): number[] {
  return fisherShuffle(Array.from({ length: Math.max(0, n) }, (_, i) => i + 1));
}

function genString(len: number, chars: string): string {
  if (!chars) chars = "abc";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function genTree(n: number): [number, number][] {
  if (n <= 1) return [];
  const perm = fisherShuffle(Array.from({ length: n }, (_, i) => i + 1));
  const edges: [number, number][] = [];
  for (let i = 1; i < n; i++) edges.push([perm[randInt(0, i - 1)], perm[i]]);
  return fisherShuffle(edges);
}

function genGraph(
  n: number,
  m: number,
  dir: boolean,
  conn: boolean,
  loops: boolean,
): [number, number][] {
  const edges: [number, number][] = [];
  const set = new Set<string>();
  const key = (u: number, v: number) =>
    dir ? `${u}-${v}` : `${Math.min(u, v)}-${Math.max(u, v)}`;

  if (conn && n > 1) {
    for (const [u, v] of genTree(n)) {
      edges.push([u, v]);
      set.add(key(u, v));
    }
  }

  let tries = 0;
  while (edges.length < m && tries < m * 40) {
    tries++;
    const u = randInt(1, n);
    const v = randInt(1, n);
    if (!loops && u === v) continue;
    const k = key(u, v);
    if (set.has(k)) continue;
    set.add(k);
    edges.push([u, v]);
  }
  return fisherShuffle(edges);
}

/* ═══════════════════════ Resolve Size Helper ═══════════════════════ */

function rSize(
  st: "range" | "ref",
  lo: number,
  hi: number,
  ref: string,
  resolved: Map<string, number>,
  useMin: boolean,
  useMax: boolean,
): number {
  if (st === "ref" && ref && resolved.has(ref)) return Math.max(0, resolved.get(ref)!);
  return useMin ? lo : useMax ? hi : randInt(lo, hi);
}

/* ═══════════════════════ Main Generator ═══════════════════════ */

function generate(
  fields: FieldConfig[],
  count: number,
  printT: boolean,
  edgeCases: boolean,
): string {
  const lines: string[] = [];
  if (printT) lines.push(String(count));

  for (let t = 0; t < count; t++) {
    const useMin = edgeCases && t === 0 && count > 1;
    const useMax = edgeCases && t === 1 && count > 2;
    const resolved = new Map<string, number>();
    let curLine = "";

    for (const f of fields) {
      let out: string[] = [];

      switch (f.type) {
        case "integer": {
          const v = useMin ? f.min : useMax ? f.max : randInt(f.min, f.max);
          resolved.set(f.id, v);
          out = [String(v)];
          break;
        }
        case "float": {
          const v = useMin ? f.min : useMax ? f.max : randFloat(f.min, f.max, f.precision);
          out = [String(v)];
          break;
        }
        case "integer_array": {
          const len = rSize(f.sizeType, f.sizeMin, f.sizeMax, f.sizeRef, resolved, useMin, useMax);
          const arr = genIntArray(len, f.valueMin, f.valueMax, f.distinct);
          if (f.sorted === "asc") arr.sort((a, b) => a - b);
          else if (f.sorted === "desc") arr.sort((a, b) => b - a);
          out = [arr.join(" ")];
          break;
        }
        case "string": {
          const len = rSize(f.sizeType, f.sizeMin, f.sizeMax, f.sizeRef, resolved, useMin, useMax);
          const chars = f.charset === "custom" ? f.customChars || "abc" : CHARSETS[f.charset] || CHARSETS.lowercase;
          out = [genString(len, chars)];
          break;
        }
        case "permutation": {
          const n = rSize(f.sizeType, f.sizeMin, f.sizeMax, f.sizeRef, resolved, useMin, useMax);
          out = [genPermutation(n).join(" ")];
          break;
        }
        case "matrix": {
          const rows = rSize(f.rowsType, f.rowsMin, f.rowsMax, f.rowsRef, resolved, useMin, useMax);
          const cols = rSize(f.colsType, f.colsMin, f.colsMax, f.colsRef, resolved, useMin, useMax);
          out = Array.from({ length: rows }, () => genIntArray(cols, f.valueMin, f.valueMax, false).join(" "));
          break;
        }
        case "graph": {
          const n = resolved.get(f.nodesRef) ?? rSize("range", 2, 10, "", resolved, useMin, useMax);
          let m = rSize(f.edgesType, f.edgesMin, f.edgesMax, f.edgesRef, resolved, useMin, useMax);
          const maxE = f.directed
            ? f.selfLoops ? n * n : n * (n - 1)
            : f.selfLoops ? (n * (n + 1)) / 2 : (n * (n - 1)) / 2;
          if (f.connected && n > 1) m = Math.max(m, n - 1);
          m = Math.min(m, Math.floor(maxE));
          const edges = genGraph(n, m, f.directed, f.connected, f.selfLoops);
          out = edges.map(([u, v]) =>
            f.weighted ? `${u} ${v} ${randInt(f.weightMin, f.weightMax)}` : `${u} ${v}`,
          );
          break;
        }
        case "tree": {
          const n = resolved.get(f.nodesRef) ?? rSize("range", 2, 10, "", resolved, useMin, useMax);
          const edges = genTree(n);
          out = edges.map(([u, v]) =>
            f.weighted ? `${u} ${v} ${randInt(f.weightMin, f.weightMax)}` : `${u} ${v}`,
          );
          break;
        }
      }

      const isMulti = out.length > 1;
      if (!isMulti && f.sameLine && curLine !== "") {
        curLine += " " + out[0];
      } else {
        if (curLine !== "") lines.push(curLine);
        if (isMulti) {
          lines.push(...out);
          curLine = "";
        } else {
          curLine = out[0] ?? "";
        }
      }
    }
    if (curLine !== "") lines.push(curLine);
  }

  return lines.join("\n") + "\n";
}

/* ═══════════════════════ Field Factory ═══════════════════════ */

let _fid = 0;

function createField(type: FieldType, existing: FieldConfig[]): FieldConfig {
  const intCount = existing.filter((f) => f.type === "integer").length;
  const label = type === "integer" ? INT_LABELS[intCount % INT_LABELS.length] : DEFAULT_LABELS[type];
  return {
    id: String(++_fid),
    type,
    label,
    sameLine: false,
    min: 1,
    max: 100000,
    precision: 2,
    sizeType: "range",
    sizeMin: 1,
    sizeMax: 10,
    sizeRef: "",
    valueMin: 1,
    valueMax: 1_000_000_000,
    distinct: false,
    sorted: "none",
    charset: "lowercase",
    customChars: "",
    rowsType: "range",
    rowsMin: 1,
    rowsMax: 5,
    rowsRef: "",
    colsType: "range",
    colsMin: 1,
    colsMax: 5,
    colsRef: "",
    nodesRef: "",
    edgesType: "range",
    edgesMin: 1,
    edgesMax: 10,
    edgesRef: "",
    directed: false,
    weighted: false,
    weightMin: 1,
    weightMax: 100,
    connected: true,
    selfLoops: false,
  };
}

/* ═══════════════════════ Styling helpers ═══════════════════════ */

const numCls = "h-8 w-20 rounded-md border bg-background px-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";
const selCls = "h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const lblCls = "text-[11px] text-muted-foreground font-medium uppercase tracking-wider";
const chkRow = "flex items-center gap-2 text-sm";

/* ═══════════════════════ Component ═══════════════════════ */

export default function TestCaseGeneratorPage() {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [testCount, setTestCount] = useState(10);
  const [printT, setPrintT] = useState(true);
  const [edgeCases, setEdgeCases] = useState(true);
  const [output, setOutput] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const addField = useCallback(
    (type: FieldType) => {
      setFields((prev) => [...prev, createField(type, prev)]);
      setShowMenu(false);
    },
    [],
  );
  const updateField = useCallback((id: string, u: Partial<FieldConfig>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...u } : f)));
  }, []);
  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);
  const moveField = useCallback((id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      if (i + dir < 0 || i + dir >= prev.length) return prev;
      const n = [...prev];
      [n[i], n[i + dir]] = [n[i + dir], n[i]];
      return n;
    });
  }, []);

  const doGenerate = useCallback(() => {
    if (fields.length === 0) {
      toast.error("Add at least one field before generating.");
      return;
    }
    try {
      const result = generate(fields, testCount, printT, edgeCases);
      setOutput(result);
      toast.success(`Generated ${testCount} test case${testCount !== 1 ? "s" : ""}`);
    } catch (e) {
      toast.error("Generation failed: " + (e instanceof Error ? e.message : String(e)));
    }
  }, [fields, testCount, printT, edgeCases]);

  const doCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  }, [output]);

  const doDownload = useCallback(() => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-cases.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded test-cases.txt");
  }, [output]);

  /* ─── Size-row helper ─── */
  const intsBefore = (index: number) => fields.slice(0, index).filter((f) => f.type === "integer");

  const SizeRow = ({
    label,
    sType,
    sMin,
    sMax,
    sRef,
    idx,
    tKey,
    mnKey,
    mxKey,
    rKey,
    fid,
  }: {
    label: string;
    sType: string;
    sMin: number;
    sMax: number;
    sRef: string;
    idx: number;
    tKey: string;
    mnKey: string;
    mxKey: string;
    rKey: string;
    fid: string;
  }) => {
    const ints = intsBefore(idx);
    return (
      <div className="space-y-1">
        <span className={lblCls}>{label}</span>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className={selCls}
            value={sType}
            onChange={(e) => updateField(fid, { [tKey]: e.target.value } as unknown as Partial<FieldConfig>)}
          >
            <option value="range">Range</option>
            {ints.length > 0 && <option value="ref">Use field</option>}
          </select>
          {sType === "range" ? (
            <>
              <input
                type="number"
                className={numCls}
                value={sMin}
                onChange={(e) => updateField(fid, { [mnKey]: Number(e.target.value) } as unknown as Partial<FieldConfig>)}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="number"
                className={numCls}
                value={sMax}
                onChange={(e) => updateField(fid, { [mxKey]: Number(e.target.value) } as unknown as Partial<FieldConfig>)}
              />
            </>
          ) : (
            <select
              className={selCls}
              value={sRef}
              onChange={(e) => updateField(fid, { [rKey]: e.target.value } as unknown as Partial<FieldConfig>)}
            >
              <option value="">Select…</option>
              {ints.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  };

  /* ─── Field body renderer ─── */
  const renderBody = (f: FieldConfig, idx: number) => {
    const ints = intsBefore(idx);

    switch (f.type) {
      case "integer":
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <span className={lblCls}>Range</span>
            <input type="number" className={numCls} value={f.min} onChange={(e) => updateField(f.id, { min: Number(e.target.value) })} />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="number" className={numCls} value={f.max} onChange={(e) => updateField(f.id, { max: Number(e.target.value) })} />
          </div>
        );
      case "float":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={lblCls}>Range</span>
              <input type="number" className={numCls} value={f.min} onChange={(e) => updateField(f.id, { min: Number(e.target.value) })} />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="number" className={numCls} value={f.max} onChange={(e) => updateField(f.id, { max: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2">
              <span className={lblCls}>Decimals</span>
              <input
                type="number"
                className={`${numCls} w-16`}
                min={0}
                max={10}
                value={f.precision}
                onChange={(e) => updateField(f.id, { precision: Number(e.target.value) })}
              />
            </div>
          </div>
        );
      case "integer_array":
        return (
          <div className="space-y-3">
            <SizeRow label="Length" sType={f.sizeType} sMin={f.sizeMin} sMax={f.sizeMax} sRef={f.sizeRef} idx={idx} tKey="sizeType" mnKey="sizeMin" mxKey="sizeMax" rKey="sizeRef" fid={f.id} />
            <div className="flex flex-wrap gap-2 items-center">
              <span className={lblCls}>Values</span>
              <input type="number" className={numCls} value={f.valueMin} onChange={(e) => updateField(f.id, { valueMin: Number(e.target.value) })} />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="number" className={numCls} value={f.valueMax} onChange={(e) => updateField(f.id, { valueMax: Number(e.target.value) })} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className={chkRow}>
                <input type="checkbox" checked={f.distinct} onChange={(e) => updateField(f.id, { distinct: e.target.checked })} className="accent-primary" />
                Distinct
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sorted:</span>
                <select className={selCls} value={f.sorted} onChange={(e) => updateField(f.id, { sorted: e.target.value as "none" | "asc" | "desc" })}>
                  <option value="none">None</option>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        );
      case "string":
        return (
          <div className="space-y-3">
            <SizeRow label="Length" sType={f.sizeType} sMin={f.sizeMin} sMax={f.sizeMax} sRef={f.sizeRef} idx={idx} tKey="sizeType" mnKey="sizeMin" mxKey="sizeMax" rKey="sizeRef" fid={f.id} />
            <div className="flex flex-wrap gap-2 items-center">
              <span className={lblCls}>Charset</span>
              <select className={selCls} value={f.charset} onChange={(e) => updateField(f.id, { charset: e.target.value as FieldConfig["charset"] })}>
                <option value="lowercase">a-z</option>
                <option value="uppercase">A-Z</option>
                <option value="alphanumeric">a-z A-Z 0-9</option>
                <option value="digits">0-9</option>
                <option value="binary">0-1</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {f.charset === "custom" && (
              <div className="flex items-center gap-2">
                <span className={lblCls}>Chars</span>
                <input
                  type="text"
                  className="h-8 flex-1 rounded-md border bg-background px-2 text-sm font-mono"
                  placeholder="abc123"
                  value={f.customChars}
                  onChange={(e) => updateField(f.id, { customChars: e.target.value })}
                />
              </div>
            )}
          </div>
        );
      case "permutation":
        return (
          <SizeRow label="N (generates 1…N)" sType={f.sizeType} sMin={f.sizeMin} sMax={f.sizeMax} sRef={f.sizeRef} idx={idx} tKey="sizeType" mnKey="sizeMin" mxKey="sizeMax" rKey="sizeRef" fid={f.id} />
        );
      case "matrix":
        return (
          <div className="space-y-3">
            <SizeRow label="Rows" sType={f.rowsType} sMin={f.rowsMin} sMax={f.rowsMax} sRef={f.rowsRef} idx={idx} tKey="rowsType" mnKey="rowsMin" mxKey="rowsMax" rKey="rowsRef" fid={f.id} />
            <SizeRow label="Cols" sType={f.colsType} sMin={f.colsMin} sMax={f.colsMax} sRef={f.colsRef} idx={idx} tKey="colsType" mnKey="colsMin" mxKey="colsMax" rKey="colsRef" fid={f.id} />
            <div className="flex flex-wrap gap-2 items-center">
              <span className={lblCls}>Values</span>
              <input type="number" className={numCls} value={f.valueMin} onChange={(e) => updateField(f.id, { valueMin: Number(e.target.value) })} />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="number" className={numCls} value={f.valueMax} onChange={(e) => updateField(f.id, { valueMax: Number(e.target.value) })} />
            </div>
          </div>
        );
      case "graph":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className={lblCls}>Nodes (reference an Integer field)</span>
              <select className={selCls} value={f.nodesRef} onChange={(e) => updateField(f.id, { nodesRef: e.target.value })}>
                <option value="">Select…</option>
                {ints.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </select>
              {ints.length === 0 && <p className="text-[10px] text-rose-500">Add an Integer field above for node count.</p>}
            </div>
            <SizeRow label="Edge Count" sType={f.edgesType} sMin={f.edgesMin} sMax={f.edgesMax} sRef={f.edgesRef} idx={idx} tKey="edgesType" mnKey="edgesMin" mxKey="edgesMax" rKey="edgesRef" fid={f.id} />
            <div className="flex flex-wrap gap-4">
              <label className={chkRow}>
                <input type="checkbox" checked={f.directed} onChange={(e) => updateField(f.id, { directed: e.target.checked })} className="accent-primary" />
                Directed
              </label>
              <label className={chkRow}>
                <input type="checkbox" checked={f.connected} onChange={(e) => updateField(f.id, { connected: e.target.checked })} className="accent-primary" />
                Connected
              </label>
              <label className={chkRow}>
                <input type="checkbox" checked={f.selfLoops} onChange={(e) => updateField(f.id, { selfLoops: e.target.checked })} className="accent-primary" />
                Self-loops
              </label>
            </div>
            <label className={chkRow}>
              <input type="checkbox" checked={f.weighted} onChange={(e) => updateField(f.id, { weighted: e.target.checked })} className="accent-primary" />
              Weighted
            </label>
            {f.weighted && (
              <div className="flex flex-wrap gap-2 items-center pl-6">
                <span className={lblCls}>Weights</span>
                <input type="number" className={numCls} value={f.weightMin} onChange={(e) => updateField(f.id, { weightMin: Number(e.target.value) })} />
                <span className="text-xs text-muted-foreground">to</span>
                <input type="number" className={numCls} value={f.weightMax} onChange={(e) => updateField(f.id, { weightMax: Number(e.target.value) })} />
              </div>
            )}
          </div>
        );
      case "tree":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className={lblCls}>Nodes (reference an Integer field)</span>
              <select className={selCls} value={f.nodesRef} onChange={(e) => updateField(f.id, { nodesRef: e.target.value })}>
                <option value="">Select…</option>
                {ints.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </select>
              {ints.length === 0 && <p className="text-[10px] text-rose-500">Add an Integer field above for node count.</p>}
            </div>
            <label className={chkRow}>
              <input type="checkbox" checked={f.weighted} onChange={(e) => updateField(f.id, { weighted: e.target.checked })} className="accent-primary" />
              Weighted
            </label>
            {f.weighted && (
              <div className="flex flex-wrap gap-2 items-center pl-6">
                <span className={lblCls}>Weights</span>
                <input type="number" className={numCls} value={f.weightMin} onChange={(e) => updateField(f.id, { weightMin: Number(e.target.value) })} />
                <span className="text-xs text-muted-foreground">to</span>
                <input type="number" className={numCls} value={f.weightMax} onChange={(e) => updateField(f.id, { weightMax: Number(e.target.value) })} />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  /* ─── Format preview ─── */
  const formatPreview = () => {
    const lines: string[] = [];
    if (printT) lines.push("T");
    let cur = "";
    for (const f of fields) {
      let tok = "";
      switch (f.type) {
        case "integer":
          tok = f.label;
          break;
        case "float":
          tok = `${f.label} (float)`;
          break;
        case "integer_array":
          tok = `${f.label}[1] ${f.label}[2] … ${f.label}[n]`;
          break;
        case "string":
          tok = `${f.label} (string)`;
          break;
        case "permutation":
          tok = `${f.label}[1] … ${f.label}[N] (perm)`;
          break;
        case "matrix":
          if (cur) {
            lines.push(cur);
            cur = "";
          }
          lines.push(`${f.label} (R rows × C cols)`);
          continue;
        case "graph":
          if (cur) {
            lines.push(cur);
            cur = "";
          }
          lines.push(`${f.label} (M edges${f.weighted ? " + weights" : ""})`);
          continue;
        case "tree":
          if (cur) {
            lines.push(cur);
            cur = "";
          }
          lines.push(`${f.label} (N−1 edges${f.weighted ? " + weights" : ""})`);
          continue;
      }
      if (f.sameLine && cur) cur += "  " + tok;
      else {
        if (cur) lines.push(cur);
        cur = tok;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  /* ═══════════════════════ JSX ═══════════════════════ */

  const meta = (type: FieldType) => FIELD_META.find((m) => m.type === type)!;

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-8 pb-16 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Test Case Generator</h1>
            <p className="text-sm text-muted-foreground">Build stress-test inputs for competitive programming problems.</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ─── Left: Config ─── */}
          <div className="space-y-4">
            {/* Settings card */}
            <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-3">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Test Cases:</span>
                  <input
                    type="number"
                    min={1}
                    className={`${numCls} w-24`}
                    value={testCount}
                    onChange={(e) => setTestCount(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <label className={chkRow}>
                  <input type="checkbox" checked={printT} onChange={(e) => setPrintT(e.target.checked)} className="accent-primary" />
                  Print T
                </label>
                <label className={chkRow}>
                  <input type="checkbox" checked={edgeCases} onChange={(e) => setEdgeCases(e.target.checked)} className="accent-primary" />
                  Edge cases (min/max)
                </label>
              </div>
              {edgeCases && testCount > 2 && (
                <p className="text-[10px] text-muted-foreground">
                  Test #1 uses minimum sizes, test #2 uses maximum sizes, the rest are random.
                </p>
              )}
            </div>

            {/* Section header */}
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Fields</h2>
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-xs text-muted-foreground">{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Field cards */}
            <AnimatePresence mode="popLayout">
              {fields.map((f, i) => {
                const m = meta(f.type);
                const Icon = m.icon;
                return (
                  <motion.div
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 rounded-2xl bg-card border shadow-sm space-y-3"
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 ${m.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {m.label}
                      </span>
                      <input
                        type="text"
                        className="h-7 w-20 rounded-md border bg-background px-2 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                        value={f.label}
                        onChange={(e) => updateField(f.id, { label: e.target.value })}
                      />
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(f.id, -1)} disabled={i === 0}>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(f.id, 1)} disabled={i === fields.length - 1}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeField(f.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Type-specific body */}
                    {renderBody(f, i)}

                    {/* Same-line toggle */}
                    {i > 0 && !MULTI_LINE_TYPES.has(f.type) && (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
                        <input
                          type="checkbox"
                          checked={f.sameLine}
                          onChange={(e) => updateField(f.id, { sameLine: e.target.checked })}
                          className="accent-primary"
                        />
                        Print on same line as previous field
                      </label>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {fields.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border/50 p-8 flex flex-col items-center gap-2 text-muted-foreground/50">
                <FlaskConical className="w-8 h-8" />
                <p className="text-sm font-medium">No fields yet</p>
                <p className="text-xs">Add fields below to define your test-case format.</p>
              </div>
            )}

            {/* Add field button + menu */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowMenu(!showMenu)}>
                <Plus className="w-4 h-4" />
                Add Field
              </Button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {FIELD_META.map((fm) => (
                        <button
                          key={fm.type}
                          onClick={() => addField(fm.type)}
                          className="p-3 rounded-xl border bg-card hover:bg-secondary/80 transition-colors text-left group cursor-pointer"
                        >
                          <fm.icon className={`w-4 h-4 mb-1 ${fm.color} group-hover:scale-110 transition-transform`} />
                          <div className="text-xs font-semibold">{fm.label}</div>
                          <div className="text-[10px] text-muted-foreground">{fm.desc}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ─── Right: Output ─── */}
          <div className="space-y-4">
            {/* Format preview */}
            {fields.length > 0 && (
              <div className="p-3 rounded-xl bg-card border">
                <span className={lblCls}>Input Format Preview</span>
                <pre className="mt-1 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {formatPreview().join("\n")}
                </pre>
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={doGenerate} className="gap-2 flex-1 sm:flex-none">
                <Play className="w-4 h-4" /> Generate
              </Button>
              <Button variant="outline" onClick={doCopy} disabled={!output} className="gap-2">
                <Copy className="w-4 h-4" /> Copy
              </Button>
              <Button variant="outline" onClick={doDownload} disabled={!output} className="gap-2">
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>

            {/* Output */}
            {output && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-secondary/30">
                  <span className="text-xs font-medium text-muted-foreground">
                    {output.split("\n").filter(Boolean).length} lines &middot;{" "}
                    {output.length > 1000 ? `${(output.length / 1024).toFixed(1)} KB` : `${output.length} chars`}
                  </span>
                </div>
                <pre className="p-4 text-xs font-mono leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre select-all">
                  {output.length > 50_000 ? output.slice(0, 50_000) + "\n… (truncated for display)" : output}
                </pre>
              </motion.div>
            )}

            {/* Tips card */}
            <div className="p-4 rounded-xl bg-secondary/30 border space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tips</h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Fields output top-to-bottom. Use &quot;same line&quot; to combine fields like <code className="font-mono bg-secondary px-1 rounded">N M</code>.</li>
                <li>Array / String / Permutation length can reference an Integer field above.</li>
                <li>Graph &amp; Tree require an Integer field for node count — add one first.</li>
                <li>Edge cases toggle makes test #1 use all minimums and #2 use all maximums.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
