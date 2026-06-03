import { Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";

export type Group = {
  id: string | number;
  name: string;
  memberCount: number;
  problemCount: number;
  lastActive: string;
  members: string[];
  memberDetails?: { id: number; username: string }[];
  isOwner?: boolean;
};

type GroupCardProps = {
  group: Group;
  onClick?: () => void;
  onDelete?: () => void;
  isActive?: boolean;
  index?: number;
};

export const GroupCard = ({ group, onClick, onDelete, isActive = false, index = 0 }: GroupCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05, ease: [0.2, 0, 0, 1] }}
      onClick={onClick}
      className={`relative group w-full text-left px-4.5 py-3 rounded-xl border transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/25 shadow-sm"
          : "border-transparent hover:bg-secondary/40 hover:border-border/30"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r bg-primary" />
      )}
      <div className="flex items-center justify-between">
        <span className={`text-base font-semibold truncate pr-6 ${isActive ? "text-primary" : "text-foreground"}`}>
          {group.name}
        </span>
        <div className="relative flex items-center shrink-0 min-h-[28px]">
          <span
            className={`text-xs font-mono tabular-nums text-muted-foreground transition-opacity ${
              group.isOwner && onDelete ? "group-hover:opacity-0" : ""
            }`}
          >
            {group.problemCount}
          </span>
          {group.isOwner && onDelete && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="absolute right-0 p-1.5 -mr-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{group.memberCount} members</span>
        <span className="text-sm text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground truncate">{group.lastActive}</span>
      </div>
    </motion.button>
  );
};
