import { getPlatformDetails, PlatformMark } from "./icons/PlatformIcons";

type PlatformBadgeProps = {
  url: string;
  size?: "sm" | "md";
  showLabel?: boolean;
};

export const PlatformBadge = ({ url, size = "sm", showLabel = true }: PlatformBadgeProps) => {
  const platform = getPlatformDetails(url);
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div
      className={`flex items-center gap-1.5 ${showLabel ? "px-2 py-0.5 rounded-md bg-secondary" : ""}`}
      title={!showLabel ? platform.name : undefined}
    >
      <PlatformMark source={url} className={iconSize} alt={platform.name} decorative={showLabel} />
      {showLabel && (
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {platform.name}
        </span>
      )}
    </div>
  );
};
