import { useEffect, useState } from "react";

import { getPlatformDetails, PlatformMark } from "@/components/icons/PlatformIcons";

type ProblemThumbnailProps = {
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  variant?: "card" | "hero";
};

export const ProblemThumbnail = ({
  title,
  url,
  thumbnailUrl,
  variant = "card",
}: ProblemThumbnailProps) => {
  const [showFallback, setShowFallback] = useState(!thumbnailUrl);
  const platform = getPlatformDetails(url);
  const isHero = variant === "hero";

  useEffect(() => {
    setShowFallback(!thumbnailUrl);
  }, [thumbnailUrl]);

  if (thumbnailUrl && !showFallback) {
    return (
      <img
        src={thumbnailUrl}
        alt={title}
        className={`h-full w-full object-cover ${isHero ? "transition-transform duration-500 hover:scale-105" : ""}`}
        loading={isHero ? "eager" : "lazy"}
        decoding="async"
        onError={() => setShowFallback(true)}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-background via-background to-secondary">
      <div
        className={`flex items-center justify-center rounded-2xl bg-card/95 shadow-sm ring-1 ring-border/50 ${
          isHero ? "px-5 py-4" : "px-3 py-2.5"
        }`}
      >
        <PlatformMark
          source={url}
          className={isHero ? "h-12 w-12 sm:h-14 sm:w-14" : "h-6 w-6"}
          decorative
        />
      </div>

      {isHero && (
        <span className="mt-3 max-w-full px-3 text-center text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
          {platform.name}
        </span>
      )}
    </div>
  );
};
