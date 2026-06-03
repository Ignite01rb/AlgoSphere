import { Trash2, User, Calendar } from "lucide-react";
import { motion } from "framer-motion";

import { ProblemThumbnail } from "./ProblemThumbnail";
import { getDifficultyColor, hexToRgba } from "@/lib/difficulty-colors";
import { formatRelativeTime } from "@/lib/format";
import type { Problem } from "@/lib/types";

type ProblemCardProps = {
  problem: Problem;
  index?: number;
  onClick?: () => void;
  onDelete?: (event: React.MouseEvent) => void;
};

export const ProblemCard = ({ problem, index = 0, onClick, onDelete }: ProblemCardProps) => {
  const diffColor = getDifficultyColor(problem.platform, problem.difficulty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -3, 
        borderColor: diffColor,
        boxShadow: `0 10px 25px -10px ${hexToRgba(diffColor, 0.25)}` 
      }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="group flex flex-col gap-3.5 rounded-xl border border-border/40 bg-card/45 dark:bg-card/10 p-4.5 w-full text-left relative overflow-hidden transition-all duration-200"
    >
      {/* Decorative accent top border matching difficulty */}
      <span 
        className="absolute top-0 left-0 right-0 h-[2px] transition-all" 
        style={{ backgroundColor: diffColor }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 cursor-pointer flex-1 min-w-0" onClick={onClick}>
          <div className="w-11 h-11 rounded-lg bg-secondary/50 border border-border/30 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5 shadow-inner">
            <ProblemThumbnail title={problem.title} url={problem.url} thumbnailUrl={problem.thumbnailUrl} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {problem.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
              {problem.contest ?? problem.platform}
            </p>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(event);
            }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer flex items-center justify-center"
            title="Remove problem"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Render Tags if available */}
      {problem.tags && problem.tags.trim() !== "" && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {problem.tags.split(",").map((tag) => (
            <span 
              key={tag} 
              className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground border border-border/30"
            >
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Bottom Footer Section */}
      <div className="flex items-center justify-between border-t border-border/20 pt-3 mt-1 text-[11px] text-muted-foreground font-mono">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span>@{problem.sharedBy}</span>
        </div>

        <div className="flex items-center gap-3">
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: hexToRgba(diffColor, 0.12),
              color: diffColor,
            }}
          >
            {problem.difficulty}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="tabular-nums">{formatRelativeTime(problem.sharedAt)}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};
