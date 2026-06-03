import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Dices,
  ExternalLink,
  Search,
  Shuffle,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import rawData from "@/data/company-problems.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CompanyProblem = {
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  frequency: number;
  acceptance_rate: number;
  link: string;
  topics: string;
};

type RandomPick = {
  problem: CompanyProblem;
  company: string;
  fromAll: boolean;
};

const data = rawData as {
  metadata: { total_companies: number; total_problems: number };
  companies: Record<string, CompanyProblem[]>;
};

// ---------------------------------------------------------------------------
// Pre-processed constants
// ---------------------------------------------------------------------------

const companiesList = Object.entries(data.companies)
  .filter(([, probs]) => probs.length > 0)
  .sort((a, b) => b[1].length - a[1].length);

const totalProblems = companiesList.reduce((sum, [, p]) => sum + p.length, 0);

const allProblemsFlat = companiesList.flatMap(([company, problems]) =>
  problems.map((p) => ({ problem: p, company })),
);

const DIFF_COLORS: Record<string, { text: string; bg: string }> = {
  EASY: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  MEDIUM: { text: "text-amber-400", bg: "bg-amber-500/10" },
  HARD: { text: "text-red-400", bg: "bg-red-500/10" },
};

const INITIAL_VISIBLE = 60;

type SortKey = "frequency" | "acceptance_rate" | "title";

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

const CompanyProblemsPage = () => {
  // Company browser
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  // Problem filters
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [titleSearch, setTitleSearch] = useState("");

  // Topic picker
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const topicRef = useRef<HTMLDivElement>(null);

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>("frequency");
  const [sortAsc, setSortAsc] = useState(false);

  // Random
  const [randomPick, setRandomPick] = useState<RandomPick | null>(null);

  // ---- Side effects ----

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
        setShowTopicPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (randomPick) setRandomPick(null);
        else if (showTopicPicker) setShowTopicPicker(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [randomPick, showTopicPicker]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [companySearch]);

  // ---- Derived data ----

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companiesList;
    const q = companySearch.toLowerCase();
    return companiesList.filter(([name]) => name.toLowerCase().includes(q));
  }, [companySearch]);

  const problems = useMemo(
    () => (selectedCompany ? (data.companies[selectedCompany] ?? []) : []),
    [selectedCompany],
  );

  const companyTopics = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) =>
      p.topics.split(", ").forEach((t) => {
        if (t.trim()) set.add(t.trim());
      }),
    );
    return Array.from(set).sort();
  }, [problems]);

  const filteredTopics = useMemo(() => {
    if (!topicQuery.trim()) return companyTopics;
    const q = topicQuery.toLowerCase();
    return companyTopics.filter((t) => t.toLowerCase().includes(q));
  }, [companyTopics, topicQuery]);

  const diffStats = useMemo(() => {
    const s = { EASY: 0, MEDIUM: 0, HARD: 0 };
    problems.forEach((p) => s[p.difficulty]++);
    return s;
  }, [problems]);

  const filtered = useMemo(() => {
    let result = problems;
    if (difficulty) result = result.filter((p) => p.difficulty === difficulty);
    if (topicFilter)
      result = result.filter((p) => p.topics.split(", ").some((t) => t.trim() === topicFilter));
    if (titleSearch.trim()) {
      const q = titleSearch.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "frequency") cmp = a.frequency - b.frequency;
      else if (sortBy === "acceptance_rate") cmp = a.acceptance_rate - b.acceptance_rate;
      else cmp = a.title.localeCompare(b.title);
      return sortAsc ? cmp : -cmp;
    });
  }, [problems, difficulty, topicFilter, titleSearch, sortBy, sortAsc]);

  const hasFilters = Boolean(difficulty || topicFilter || titleSearch.trim());

  // ---- Actions ----

  const selectCompany = useCallback((name: string) => {
    setSelectedCompany(name);
    setDifficulty(null);
    setTopicFilter(null);
    setTitleSearch("");
    setTopicQuery("");
    setSortBy("frequency");
    setSortAsc(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goBack = useCallback(() => {
    setSelectedCompany(null);
    setDifficulty(null);
    setTopicFilter(null);
    setTitleSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const clearFilters = useCallback(() => {
    setDifficulty(null);
    setTopicFilter(null);
    setTitleSearch("");
  }, []);

  const pickRandom = useCallback(
    (fromAll: boolean) => {
      if (fromAll) {
        const idx = Math.floor(Math.random() * allProblemsFlat.length);
        setRandomPick({ ...allProblemsFlat[idx], fromAll: true });
      } else if (filtered.length > 0) {
        const idx = Math.floor(Math.random() * filtered.length);
        setRandomPick({ problem: filtered[idx], company: selectedCompany!, fromAll: false });
      }
    },
    [filtered, selectedCompany],
  );

  const toggleSort = useCallback(
    (col: SortKey) => {
      if (sortBy === col) setSortAsc((v) => !v);
      else {
        setSortBy(col);
        setSortAsc(false);
      }
    },
    [sortBy],
  );

  // ---- Render ----

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      {/* ========== HEADER ========== */}
      <div className="w-full px-6 pt-10 pb-2">
        {selectedCompany ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={goBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground leading-none mb-1">
                  Company Problems
                </span>
                <h1 className="text-2xl font-bold tracking-tight">{selectedCompany}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => pickRandom(false)}
                disabled={filtered.length === 0}
              >
                <Dices className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Random{hasFilters ? " (Filtered)" : ""}</span>
                <span className="sm:hidden">Random</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => pickRandom(true)}>
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Surprise Me</span>
                <span className="sm:hidden">Any</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground leading-none mb-1">
                Interview Prep
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Company Problems</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {companiesList.length} companies &middot; {totalProblems.toLocaleString()} problems
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 self-start md:self-auto"
              onClick={() => pickRandom(true)}
            >
              <Shuffle className="w-3.5 h-3.5" />
              Surprise Me
            </Button>
          </div>
        )}
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="w-full px-6 py-6 space-y-6 pb-20">
        {selectedCompany ? (
          /* ---------- PROBLEM VIEW ---------- */
          <>
            {/* Difficulty stat cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(difficulty === d ? null : d)}
                  className={`rounded-xl p-4 text-left transition-all ${DIFF_COLORS[d].bg} ${
                    difficulty === d ? "ring-2 ring-offset-2 ring-offset-background ring-current " + DIFF_COLORS[d].text : ""
                  }`}
                >
                  <div className={`text-2xl font-bold tabular-nums ${DIFF_COLORS[d].text}`}>
                    {diffStats[d]}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </div>
                </button>
              ))}
            </motion.div>

            {/* Filter bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex flex-wrap items-center gap-2"
            >
              {/* Difficulty pills */}
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                <button
                  onClick={() => setDifficulty(null)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    !difficulty
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(difficulty === d ? null : d)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      difficulty === d
                        ? "bg-background shadow-sm " + DIFF_COLORS[d].text
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Topic dropdown */}
              <div className="relative" ref={topicRef}>
                <button
                  onClick={() => setShowTopicPicker(!showTopicPicker)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    topicFilter
                      ? "border-primary/50 text-primary bg-primary/5"
                      : "border-transparent bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="max-w-[120px] truncate">{topicFilter || "Topic"}</span>
                  {topicFilter ? (
                    <X
                      className="w-3 h-3 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopicFilter(null);
                      }}
                    />
                  ) : (
                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {showTopicPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-50 top-full mt-1 left-0 w-64 bg-background border rounded-xl shadow-elevated overflow-hidden"
                    >
                      <div className="p-2">
                        <Input
                          placeholder="Search topics..."
                          value={topicQuery}
                          onChange={(e) => setTopicQuery(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto px-1 pb-1">
                        {filteredTopics.map((topic) => (
                          <button
                            key={topic}
                            onClick={() => {
                              setTopicFilter(topic);
                              setShowTopicPicker(false);
                              setTopicQuery("");
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                              topicFilter === topic
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-secondary"
                            }`}
                          >
                            {topic}
                          </button>
                        ))}
                        {filteredTopics.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No topics found</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search input */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search problems..."
                  value={titleSearch}
                  onChange={(e) => setTitleSearch(e.target.value)}
                  className="h-8 text-xs pl-8 bg-secondary/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </div>

              {/* Clear filters */}
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                  <X className="w-3 h-3" /> Clear
                </Button>
              )}
            </motion.div>

            {/* Sort controls + count */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-4 px-3 text-[11px] font-mono text-muted-foreground"
            >
              <span className="flex-1 tabular-nums">
                {filtered.length} problem{filtered.length !== 1 ? "s" : ""}
              </span>
              {(
                [
                  ["frequency", "Freq"],
                  ["acceptance_rate", "Accept"],
                  ["title", "Title"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`hidden sm:flex items-center gap-0.5 transition-colors ${
                    sortBy === key ? "text-foreground" : "hover:text-foreground"
                  }`}
                >
                  {label}
                  {sortBy === key && <span className="text-primary">{sortAsc ? " \u2191" : " \u2193"}</span>}
                </button>
              ))}
            </motion.div>

            {/* Problem list */}
            <div className="space-y-0.5">
              {filtered.length === 0 ? (
                <div className="px-3 py-12 rounded-xl bg-card shadow-card text-sm text-muted-foreground text-center">
                  {problems.length === 0 ? "No problems available." : "No problems match your filters."}
                </div>
              ) : (
                filtered.map((problem, i) => (
                  <motion.a
                    key={problem.link + i}
                    href={problem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.4) }}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* Index */}
                    <span className="text-[10px] font-mono text-muted-foreground/40 w-5 text-right tabular-nums flex-shrink-0">
                      {i + 1}
                    </span>

                    {/* Title + topics */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground truncate">
                          {problem.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {problem.topics
                          .split(", ")
                          .filter(Boolean)
                          .slice(0, 3)
                          .map((topic) => (
                            <span
                              key={topic}
                              className="text-[10px] leading-tight px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                            >
                              {topic}
                            </span>
                          ))}
                        {problem.topics.split(", ").filter(Boolean).length > 3 && (
                          <span className="text-[10px] text-muted-foreground/50">
                            +{problem.topics.split(", ").filter(Boolean).length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Difficulty badge */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${DIFF_COLORS[problem.difficulty].bg} ${DIFF_COLORS[problem.difficulty].text}`}
                    >
                      {problem.difficulty}
                    </span>

                    {/* Frequency bar */}
                    <div className="hidden sm:flex items-center gap-1.5 w-20 flex-shrink-0">
                      <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/50"
                          style={{ width: `${problem.frequency}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60 w-7 text-right">
                        {Math.round(problem.frequency)}%
                      </span>
                    </div>

                    {/* Acceptance */}
                    <span className="hidden md:inline text-[10px] font-mono tabular-nums text-muted-foreground/60 w-11 text-right flex-shrink-0">
                      {(problem.acceptance_rate * 100).toFixed(1)}%
                    </span>
                  </motion.a>
                ))
              )}
            </div>
          </>
        ) : (
          /* ---------- COMPANY BROWSER ---------- */
          <>
            {/* Search */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search companies... (e.g. Google, Amazon, Meta)"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="h-12 text-sm pl-10 bg-card border shadow-card rounded-xl"
                autoFocus
              />
              {companySearch && (
                <button
                  onClick={() => setCompanySearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>

            {/* Popular chips */}
            {!companySearch && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mr-1">
                  Popular
                </span>
                {companiesList.slice(0, 12).map(([name]) => (
                  <button
                    key={name}
                    onClick={() => selectCompany(name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-colors border border-primary/10"
                  >
                    {name}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Section header */}
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                {companySearch ? `Results (${filteredCompanies.length})` : "All Companies"}
              </h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            {/* Company grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(companySearch ? filteredCompanies : filteredCompanies.slice(0, visibleCount)).map(
                ([name, probs], i) => {
                  const easy = probs.filter((p) => p.difficulty === "EASY").length;
                  const medium = probs.filter((p) => p.difficulty === "MEDIUM").length;
                  const hard = probs.filter((p) => p.difficulty === "HARD").length;
                  const total = probs.length;

                  return (
                    <motion.button
                      key={name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(i * 0.012, 0.25) }}
                      onClick={() => selectCompany(name)}
                      className="flex flex-col items-start p-4 rounded-xl bg-card border shadow-sm hover:shadow-card hover:border-primary/20 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Building2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{name}</span>
                        <span className="ml-auto text-xs font-mono tabular-nums text-muted-foreground">
                          {total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary mt-3 overflow-hidden flex">
                        {easy > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${(easy / total) * 100}%` }}
                          />
                        )}
                        {medium > 0 && (
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${(medium / total) * 100}%` }}
                          />
                        )}
                        {hard > 0 && (
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${(hard / total) * 100}%` }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 mt-2 text-[10px] font-mono">
                        <span className="text-emerald-400">E:{easy}</span>
                        <span className="text-amber-400">M:{medium}</span>
                        <span className="text-red-400">H:{hard}</span>
                      </div>
                    </motion.button>
                  );
                },
              )}
            </div>

            {/* Show more */}
            {!companySearch && filteredCompanies.length > visibleCount && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setVisibleCount((v) => v + 60)}>
                  Show more ({filteredCompanies.length - visibleCount} remaining)
                </Button>
              </div>
            )}

            {filteredCompanies.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No companies match &ldquo;{companySearch}&rdquo;
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== RANDOM PROBLEM MODAL ========== */}
      <AnimatePresence>
        {randomPick && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRandomPick(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-background rounded-2xl shadow-elevated overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Dices className="w-5 h-5 text-primary" />
                  <span className="text-xs font-mono uppercase tracking-widest text-primary">
                    Random Pick
                  </span>
                </div>
                <h3 className="text-xl font-bold leading-snug">{randomPick.problem.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {randomPick.company}
                </p>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md ${DIFF_COLORS[randomPick.problem.difficulty].bg} ${DIFF_COLORS[randomPick.problem.difficulty].text}`}
                  >
                    {randomPick.problem.difficulty}
                  </span>
                  {randomPick.problem.topics
                    .split(", ")
                    .filter(Boolean)
                    .map((topic) => (
                      <span
                        key={topic}
                        className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground"
                      >
                        {topic}
                      </span>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Frequency
                    </div>
                    <div className="text-lg font-bold tabular-nums mt-0.5">
                      {Math.round(randomPick.problem.frequency)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Acceptance
                    </div>
                    <div className="text-lg font-bold tabular-nums mt-0.5">
                      {(randomPick.problem.acceptance_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button asChild className="flex-1 gap-1.5">
                    <a href={randomPick.problem.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in LeetCode
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => pickRandom(randomPick.fromAll)}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Another
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanyProblemsPage;
