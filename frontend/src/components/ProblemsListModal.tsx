import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PlatformBadge } from "@/components/PlatformBadge";
import { getDifficultyColor, hexToRgba } from "@/lib/difficulty-colors";
import { formatRelativeTime } from "@/lib/format";
import type { Problem } from "@/lib/types";

type ProblemsListModalProps = {
  title: string;
  queryKey: unknown[];
  queryFn: () => Promise<Problem[]>;
  onClose: () => void;
};

export const ProblemsListModal = ({ title, queryKey, queryFn, onClose }: ProblemsListModalProps) => {
  const { data: problems = [], isLoading } = useQuery({ queryKey, queryFn });
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const platforms = useMemo(
    () => [...new Set(problems.map((p) => p.platform))].sort(),
    [problems],
  );

  const difficulties = useMemo(
    () => [...new Set(problems.map((p) => p.difficulty))].sort(),
    [problems],
  );

  const filtered = useMemo(() => {
    let result = problems;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.contest ?? "").toLowerCase().includes(q) ||
          p.sharedBy.toLowerCase().includes(q),
      );
    }

    if (platformFilter) {
      result = result.filter((p) => p.platform === platformFilter);
    }

    if (difficultyFilter) {
      result = result.filter((p) => p.difficulty === difficultyFilter);
    }

    if (sortBy === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [problems, search, platformFilter, difficultyFilter, sortBy]);

  const activeFilterCount =
    (platformFilter ? 1 : 0) + (difficultyFilter ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length === problems.length
                ? `${problems.length} problems`
                : `${filtered.length} of ${problems.length} problems`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {!isLoading && problems.length > 0 && (
          <div className="px-6 py-3 border-b space-y-2.5 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, contest, or user..."
                className="w-full rounded-lg border bg-secondary/30 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Platform filter */}
              <select
                value={platformFilter ?? ""}
                onChange={(e) => setPlatformFilter(e.target.value || null)}
                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Difficulty filter */}
              <select
                value={difficultyFilter ?? ""}
                onChange={(e) => setDifficultyFilter(e.target.value || null)}
                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All difficulties</option>
                {difficulties.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setPlatformFilter(null);
                    setDifficultyFilter(null);
                  }}
                  className="text-xs text-primary hover:underline ml-auto"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollbar indicator */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex-shrink-0 px-6 py-1.5 bg-secondary/20 border-b">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                Showing {filtered.length} {filtered.length === 1 ? "problem" : "problems"}
              </span>
              <span className="text-[10px] text-muted-foreground/40">Scroll to see more</span>
            </div>
          </div>
        )}

        {/* Problem list */}
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              {problems.length === 0
                ? "No problems shared yet."
                : "No problems match your filters."}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((problem, i) => (
                <motion.a
                  key={problem.id}
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-secondary/50 transition-colors group"
                >
                  <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold font-mono text-muted-foreground flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block truncate group-hover:text-primary transition-colors">
                      {problem.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PlatformBadge url={problem.url} size="sm" showLabel={false} />
                      <span className="text-xs text-muted-foreground truncate">
                        {problem.contest ?? problem.platform}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">@{problem.sharedBy}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(problem.sharedAt)}</span>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      backgroundColor: hexToRgba(getDifficultyColor(problem.platform, problem.difficulty), 0.15),
                      color: getDifficultyColor(problem.platform, problem.difficulty),
                    }}
                  >
                    {problem.difficulty}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
