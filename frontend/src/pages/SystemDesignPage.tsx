import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import {
  categories,
  topics,
  getCategoryColor,
  getDifficultyColor,
} from "@/data/system-design-topics";

const DIFF_STYLES: Record<string, { bg: string; text: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
  red: { bg: "bg-red-500/10", text: "text-red-500" },
};

const CAT_BG: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  purple: "bg-purple-500/10 text-purple-500",
  orange: "bg-orange-500/10 text-orange-500",
  yellow: "bg-yellow-500/10 text-yellow-500",
  cyan: "bg-cyan-500/10 text-cyan-500",
  pink: "bg-pink-500/10 text-pink-500",
  red: "bg-red-500/10 text-red-500",
  indigo: "bg-indigo-500/10 text-indigo-500",
  violet: "bg-violet-500/10 text-violet-500",
};

export default function SystemDesignPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = topics;
    if (activeCategory) {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, activeCategory]);

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-10 pb-16 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                System Design
              </h1>
              <p className="text-muted-foreground text-sm">
                {topics.length} topics across {categories.length} categories
              </p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Master system design concepts from fundamentals to real-world
            architectures. Each topic includes explanations, key points, code
            examples, and trade-offs.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-0 bg-secondary/60 shadow-none"
            />
          </div>
        </motion.div>

        {/* Category pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2"
        >
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !activeCategory
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            All Topics
          </button>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const color = cat.color;
            return (
              <button
                key={cat.id}
                onClick={() =>
                  setActiveCategory(isActive ? null : cat.id)
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? `${CAT_BG[color] ?? "bg-secondary text-foreground"} ring-1 ring-current/20`
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </motion.div>

        {/* Section header */}
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
            {activeCat
              ? `${activeCat.icon} ${activeCat.label}`
              : "All Topics"}
          </h2>
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-xs text-muted-foreground">
            {filtered.length} topic{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Category description */}
        {activeCat && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground -mt-4"
          >
            {activeCat.description}
          </motion.p>
        )}

        {/* Topic cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No topics found</p>
            <p className="text-sm mt-1">
              Try a different search term or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((topic, i) => {
              const catColor = getCategoryColor(topic.category);
              const diffColor = getDifficultyColor(topic.difficulty);
              const diffStyle = DIFF_STYLES[diffColor] ?? DIFF_STYLES.amber;
              const catBg = CAT_BG[catColor] ?? "bg-secondary text-foreground";
              const catLabel = categories.find(
                (c) => c.id === topic.category
              )?.label;

              return (
                <motion.div
                  key={topic.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="p-5 rounded-2xl bg-card border shadow-sm cursor-pointer group flex flex-col"
                  onClick={() =>
                    navigate(`/system-design/${topic.slug}`)
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{topic.icon}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${diffStyle.bg} ${diffStyle.text}`}
                    >
                      {topic.difficulty}
                    </span>
                  </div>
                  <h3 className="font-semibold tracking-tight group-hover:text-primary transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 flex-1 line-clamp-2">
                    {topic.description}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catBg}`}
                    >
                      {catLabel}
                    </span>
                    {topic.content.codeExample && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        Code
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
