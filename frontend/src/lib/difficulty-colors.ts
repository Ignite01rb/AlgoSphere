export type DifficultyStyle = {
  color: string;
};

const LC_COLORS: Record<string, string> = {
  Easy: "#00B8A3",
  Medium: "#FFC01E",
  Hard: "#FF375F",
};

const CF_TIER_COLORS: Record<string, string> = {
  Newbie: "#808080",
  Pupil: "#008000",
  Specialist: "#03A89E",
  Expert: "#0000FF",
  "Candidate Master": "#AA00AA",
  Master: "#FF8C00",
  Grandmaster: "#FF0000",
};

const CC_STAR_COLORS: Record<string, string> = {
  "\u2605": "#666666",
  "1\u2605": "#666666",
  "2\u2605": "#1E7D22",
  "3\u2605": "#3366CC",
  "4\u2605": "#684273",
  "5\u2605": "#FFBF00",
  "6\u2605": "#FF7F00",
  "7\u2605": "#D0011B",
};

const ATCODER_COLORS: Record<string, string> = {
  Gray: "#808080",
  Brown: "#804000",
  Green: "#008000",
  Cyan: "#00C0C0",
  Blue: "#0000FF",
  Yellow: "#C0C000",
  Orange: "#FF8000",
  Red: "#FF0000",
};

function cfTier(rating: number): string {
  if (rating < 1200) return "Newbie";
  if (rating < 1400) return "Pupil";
  if (rating < 1600) return "Specialist";
  if (rating < 1900) return "Expert";
  if (rating < 2100) return "Candidate Master";
  if (rating < 2400) return "Master";
  return "Grandmaster";
}

const DEFAULT_COLOR = "#808080";

export function getDifficultyColor(platform: string, difficulty: string): string {
  const p = platform.toLowerCase();

  if (p === "leetcode") return LC_COLORS[difficulty] ?? DEFAULT_COLOR;

  if (p === "codeforces") {
    const rating = parseInt(difficulty);
    if (!isNaN(rating)) return CF_TIER_COLORS[cfTier(rating)] ?? DEFAULT_COLOR;
    return DEFAULT_COLOR;
  }

  if (p === "codechef") return CC_STAR_COLORS[difficulty] ?? DEFAULT_COLOR;
  if (p === "atcoder") return ATCODER_COLORS[difficulty] ?? DEFAULT_COLOR;

  return DEFAULT_COLOR;
}

export function getTierColor(platformLabel: string, tier: string): string {
  const p = platformLabel.toLowerCase();

  if (p === "leetcode") return LC_COLORS[tier] ?? DEFAULT_COLOR;
  if (p === "codeforces") return CF_TIER_COLORS[tier] ?? DEFAULT_COLOR;
  if (p === "codechef") return CC_STAR_COLORS[tier] ?? DEFAULT_COLOR;
  if (p === "atcoder") return ATCODER_COLORS[tier] ?? DEFAULT_COLOR;

  return DEFAULT_COLOR;
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
