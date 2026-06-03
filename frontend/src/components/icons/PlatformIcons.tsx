import type { ComponentPropsWithoutRef } from "react";
import { Code2 } from "lucide-react";

import atcoderMark from "@/assets/platforms/atcoder.png";
import codechefMark from "@/assets/platforms/codechef.svg";
import codeforcesMark from "@/assets/platforms/codeforces.png";
import coderMark from "@/assets/platforms/coder.svg";
import coderbyteMark from "@/assets/platforms/coderbyte.png";
import geeksForGeeksMark from "@/assets/platforms/geeksforgeeks.svg";
import hackerrankMark from "@/assets/platforms/hackerrank.svg";
import leetCodeMark from "@/assets/platforms/leetcode.png";
import topCoderMark from "@/assets/platforms/topcoder.png";

type PlatformDescriptor = {
  id: string;
  name: string;
  aliases: string[];
  hosts: string[];
  iconSrc?: string;
};

const platformDescriptors: PlatformDescriptor[] = [
  {
    id: "leetcode",
    name: "LeetCode",
    aliases: ["leetcode", "leet code"],
    hosts: ["leetcode.com"],
    iconSrc: leetCodeMark,
  },
  {
    id: "codeforces",
    name: "Codeforces",
    aliases: ["codeforces", "code forces"],
    hosts: ["codeforces.com"],
    iconSrc: codeforcesMark,
  },
  {
    id: "codechef",
    name: "CodeChef",
    aliases: ["codechef", "code chef"],
    hosts: ["codechef.com"],
    iconSrc: codechefMark,
  },
  {
    id: "atcoder",
    name: "AtCoder",
    aliases: ["atcoder", "at coder", "ad code"],
    hosts: ["atcoder.jp"],
    iconSrc: atcoderMark,
  },
  {
    id: "hackerrank",
    name: "HackerRank",
    aliases: ["hackerrank", "hacker rank"],
    hosts: ["hackerrank.com"],
    iconSrc: hackerrankMark,
  },
  {
    id: "topcoder",
    name: "TopCoder",
    aliases: ["topcoder", "top coder"],
    hosts: ["topcoder.com"],
    iconSrc: topCoderMark,
  },
  {
    id: "geeksforgeeks",
    name: "GeeksForGeeks",
    aliases: ["geeksforgeeks", "geeks for geeks", "gfg"],
    hosts: ["geeksforgeeks.org"],
    iconSrc: geeksForGeeksMark,
  },
  {
    id: "coder",
    name: "Coder",
    aliases: ["coder", "coderbyte", "coder byte"],
    hosts: ["coderbyte.com"],
    iconSrc: coderbyteMark,
  },
  {
    id: "coder-enterprise",
    name: "Coder",
    aliases: [],
    hosts: ["coder.com"],
    iconSrc: coderMark,
  },
];

const genericPlatform: PlatformDescriptor = {
  id: "platform",
  name: "Platform",
  aliases: [],
  hosts: [],
};

export const getPlatformDetails = (source?: string | null): PlatformDescriptor => {
  const normalized = source?.trim().toLowerCase() ?? "";
  if (!normalized) return genericPlatform;

  const byHost = platformDescriptors.find(({ hosts }) => hosts.some((host) => normalized.includes(host)));
  if (byHost) return byHost;

  return platformDescriptors.find(({ aliases }) => aliases.includes(normalized)) ?? genericPlatform;
};

type PlatformMarkProps = {
  source?: string | null;
  className?: string;
  alt?: string;
  decorative?: boolean;
  imgProps?: Omit<ComponentPropsWithoutRef<"img">, "alt" | "className" | "src">;
};

export const PlatformMark = ({
  source,
  className,
  alt,
  decorative = true,
  imgProps,
}: PlatformMarkProps) => {
  const platform = getPlatformDetails(source);

  if (!platform.iconSrc) {
    return <Code2 aria-hidden={decorative || undefined} className={className} />;
  }

  return (
    <img
      src={platform.iconSrc}
      alt={decorative ? "" : alt ?? platform.name}
      aria-hidden={decorative || undefined}
      className={`shrink-0 object-contain ${className ?? ""}`}
      decoding="async"
      {...imgProps}
    />
  );
};

const createPlatformIcon =
  (source: string) =>
  ({ className }: { className?: string }) =>
    <PlatformMark source={source} className={className} />;

export const LeetCodeIcon = createPlatformIcon("leetcode");

export const CodeforcesIcon = createPlatformIcon("codeforces");

export const CodeChefIcon = createPlatformIcon("codechef");

export const AtCoderIcon = createPlatformIcon("atcoder");

export const HackerRankIcon = createPlatformIcon("hackerrank");

export const TopCoderIcon = createPlatformIcon("topcoder");

export const GeeksForGeeksIcon = createPlatformIcon("geeksforgeeks");

export const CoderIcon = createPlatformIcon("coder");

export const GenericPlatformIcon = ({ className }: { className?: string }) => <Code2 className={className} />;
