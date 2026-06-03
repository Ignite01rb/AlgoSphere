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
        className={`flex items-center gap-2.5 p-2 rounded-xl bg-card border transition-all duration-300 ${
          isFocused 
            ? "border-primary/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] bg-card/90" 
            : "border-border/40 shadow-sm"
        }`}
      >
        <Link2 className={`w-4.5 h-4.5 ml-2.5 flex-shrink-0 transition-colors ${isFocused ? "text-primary" : "text-muted-foreground"}`} />
        <Input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Paste a LeetCode, Codeforces, AtCoder, or CodeChef URL..."
          className="border-0 shadow-none focus-visible:ring-0 text-sm bg-transparent px-0 h-9 flex-1 text-foreground placeholder:text-muted-foreground/60"
        />
        <AnimatePresence mode="wait">
          {isFetching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="font-mono">Resolving...</span>
            </motion.div>
          ) : url.trim() ? (
            <motion.div
              key="submit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ ease: [0.2, 0, 0, 1], duration: 0.2 }}
            >
              <Button type="submit" size="sm" className="h-8 px-3.5 text-xs font-bold gap-1 cursor-pointer">
                Share <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
};
