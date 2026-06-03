import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Lightbulb,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
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

export default function SystemDesignTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const topicIndex = useMemo(
    () => topics.findIndex((t) => t.slug === slug),
    [slug]
  );
  const topic = topics[topicIndex];
  const prev = topicIndex > 0 ? topics[topicIndex - 1] : null;
  const next =
    topicIndex < topics.length - 1 ? topics[topicIndex + 1] : null;

  if (!topic) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg font-medium text-muted-foreground">
          Topic not found
        </p>
        <Button variant="outline" onClick={() => navigate("/system-design")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to System Design
        </Button>
      </div>
    );
  }

  const cat = categories.find((c) => c.id === topic.category);
  const catColor = getCategoryColor(topic.category);
  const diffColor = getDifficultyColor(topic.difficulty);
  const diffStyle = DIFF_STYLES[diffColor] ?? DIFF_STYLES.amber;
  const catBg = CAT_BG[catColor] ?? "bg-secondary text-foreground";
  const { content } = topic;

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-8 pb-16 space-y-8">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => navigate("/system-design")}
          >
            <ArrowLeft className="w-4 h-4" />
            All Topics
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl">{topic.icon}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {topic.title}
              </h1>
              <p className="text-muted-foreground mt-1">
                {topic.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${catBg}`}
            >
              {cat?.icon} {cat?.label}
            </span>
            <span
              className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${diffStyle.bg} ${diffStyle.text}`}
            >
              {topic.difficulty}
            </span>
          </div>
        </motion.div>

        {/* Overview */}
        <Section title="Overview" icon={<BookOpen className="w-4 h-4" />} delay={0.05}>
          <p className="text-sm leading-relaxed text-foreground/90">
            {content.overview}
          </p>
        </Section>

        {/* Key Points */}
        <Section title="Key Points" icon={<Zap className="w-4 h-4" />} delay={0.1}>
          <ul className="space-y-2.5">
            {content.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/90">{point}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Detailed Explanation */}
        <Section
          title="How It Works"
          icon={<Lightbulb className="w-4 h-4" />}
          delay={0.15}
        >
          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {content.explanation}
          </div>
        </Section>

        {/* Code Example */}
        {content.codeExample && (
          <Section
            title={content.codeExample.title}
            icon={<Code2 className="w-4 h-4" />}
            delay={0.2}
          >
            <div className="rounded-xl bg-[#1e1e2e] border border-white/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-[11px] text-white/40 font-mono">
                  {content.codeExample.title}
                </span>
              </div>
              <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
                <code className="text-emerald-300/90 font-mono text-[13px]">
                  {content.codeExample.code}
                </code>
              </pre>
            </div>
          </Section>
        )}

        {/* Pros & Cons */}
        {(content.pros || content.cons) && (
          <Section title="Trade-offs" icon={<Zap className="w-4 h-4" />} delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.pros && (
                <div className="rounded-xl border bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                    <ThumbsUp className="w-4 h-4" />
                    Advantages
                  </div>
                  <ul className="space-y-2">
                    {content.pros.map((pro, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-emerald-500 mt-0.5">+</span>
                        <span className="text-foreground/80">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {content.cons && (
                <div className="rounded-xl border bg-red-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-500 font-medium text-sm">
                    <ThumbsDown className="w-4 h-4" />
                    Disadvantages
                  </div>
                  <ul className="space-y-2">
                    {content.cons.map((con, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-red-500 mt-0.5">−</span>
                        <span className="text-foreground/80">{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Real World Examples */}
        {content.realWorld && (
          <Section title="Real-World Examples" icon={<Zap className="w-4 h-4" />} delay={0.3}>
            <ul className="space-y-2">
              {content.realWorld.map((example, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm text-foreground/80"
                >
                  <span className="text-primary">▸</span>
                  {example}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Prev / Next navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex items-stretch gap-4 pt-4 border-t"
        >
          {prev ? (
            <button
              onClick={() => navigate(`/system-design/${prev.slug}`)}
              className="flex-1 flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left group"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Previous
                </span>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {prev.title}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <button
              onClick={() => navigate(`/system-design/${next.slug}`)}
              className="flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-right group"
            >
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Next
                </span>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {next.title}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground shrink-0" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  delay,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border bg-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      {children}
    </motion.section>
  );
}
