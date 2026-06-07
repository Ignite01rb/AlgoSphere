import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Link2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddProblemInputProps = {
  onSubmit: (url: string) => Promise<void>;
};

export const AddProblemInput = ({ onSubmit }: AddProblemInputProps) => {
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || isFetching) return;

    setIsFetching(true);
    try {
      await onSubmit(url);
      setUrl("");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div 
        className={`flex items-center gap-3 p-1.5 rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-300 ${
          isFocused 
            ? "border-red-500/50 shadow-sm bg-white" 
            : "border-border/80 dark:border-white/5 shadow-sm"
        }`}
      >
        {/* Checkbox visual placeholder on left */}
        <div className="w-4 h-4 border border-border/80 dark:border-white/20 rounded flex-shrink-0 ml-2" />
        
        <Input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Paste a LeetCode, Codeforces, AtCoder, or CodeChef URL."
          className="border-0 shadow-none focus-visible:ring-0 text-xs bg-transparent px-0 h-9 flex-1 text-foreground placeholder:text-muted-foreground/50"
        />
        
        <Button 
          type="submit" 
          size="sm" 
          disabled={!url.trim() || isFetching}
          className="h-9 px-5 text-xs font-bold bg-[#d9383a] hover:bg-red-600 text-white rounded-lg uppercase tracking-wider cursor-pointer transition-colors"
        >
          {isFetching ? (
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing
            </span>
          ) : (
            "Share"
          )}
        </Button>
      </div>
    </form>
  );
};
