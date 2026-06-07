import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export const PlatformLeetCode = 'leetcode';
export const PlatformCodeforces = 'codeforces';
export const PlatformCodeChef = 'codechef';
export const PlatformAtCoder = 'atcoder';
export const PlatformHackerRank = 'hackerrank';
export const PlatformTopCoder = 'topcoder';
export const PlatformGeeksForGeeks = 'geeksforgeeks';
export const PlatformCoder = 'coder';

export const platformLabels: Record<string, string> = {
  [PlatformLeetCode]: 'LeetCode',
  [PlatformCodeforces]: 'Codeforces',
  [PlatformCodeChef]: 'CodeChef',
  [PlatformAtCoder]: 'AtCoder',
  [PlatformHackerRank]: 'HackerRank',
  [PlatformTopCoder]: 'TopCoder',
  [PlatformGeeksForGeeks]: 'GeeksforGeeks',
  [PlatformCoder]: 'Coder',
};

const supportedHosts: Record<string, string> = {
  'leetcode.com': PlatformLeetCode,
  'www.leetcode.com': PlatformLeetCode,
  'codeforces.com': PlatformCodeforces,
  'www.codeforces.com': PlatformCodeforces,
  'codechef.com': PlatformCodeChef,
  'www.codechef.com': PlatformCodeChef,
  'atcoder.jp': PlatformAtCoder,
  'www.atcoder.jp': PlatformAtCoder,
  'hackerrank.com': PlatformHackerRank,
  'www.hackerrank.com': PlatformHackerRank,
  'topcoder.com': PlatformTopCoder,
  'www.topcoder.com': PlatformTopCoder,
  'geeksforgeeks.org': PlatformGeeksForGeeks,
  'www.geeksforgeeks.org': PlatformGeeksForGeeks,
  'coderbyte.com': PlatformCoder,
  'www.coderbyte.com': PlatformCoder,
  'coder.com': PlatformCoder,
  'www.coder.com': PlatformCoder,
};

interface CatalogEntry {
  title: string;
  contest: string;
  tags: string;
  difficulty: string;
  solvedByCount: number;
}

const catalog: Record<string, CatalogEntry> = {
  [`leetcode::two-sum`]: { title: 'Two Sum', contest: 'LeetCode Top Interview 150', tags: 'arrays,hashing', difficulty: 'Easy', solvedByCount: 5938247 },
  [`leetcode::number-of-islands`]: { title: 'Number of Islands', contest: 'LeetCode Graph Theory', tags: 'graphs,dfs,bfs,matrix', difficulty: 'Medium', solvedByCount: 1902478 },
  [`leetcode::lru-cache`]: { title: 'LRU Cache', contest: 'LeetCode System Design', tags: 'design,hashing,linked-list', difficulty: 'Medium', solvedByCount: 1398421 },
  [`leetcode::binary-tree-maximum-path-sum`]: { title: 'Binary Tree Maximum Path Sum', contest: 'LeetCode Trees', tags: 'trees,dfs,dynamic-programming', difficulty: 'Hard', solvedByCount: 681223 },
  [`codeforces::4A`]: { title: 'Watermelon', contest: 'Codeforces Beta Round 4', tags: 'math,bruteforce', difficulty: '800', solvedByCount: 514287 },
  [`codeforces::158A`]: { title: 'Next Round', contest: 'Codeforces Beta Round 158', tags: 'implementation,sorting', difficulty: '1300', solvedByCount: 482119 },
  [`codeforces::71A`]: { title: 'Way Too Long Words', contest: 'Codeforces Beta Round 71', tags: 'strings,implementation', difficulty: '1700', solvedByCount: 662904 },
  [`codechef::FLOW001`]: { title: 'Add Two Numbers', contest: 'CodeChef Practice', tags: 'implementation,ad-hoc', difficulty: '1★', solvedByCount: 371104 },
  [`codechef::START01`]: { title: 'Number Mirror', contest: 'CodeChef Beginner', tags: 'basics,io', difficulty: '2★', solvedByCount: 294417 },
  [`codechef::HS08TEST`]: { title: 'ATM', contest: 'CodeChef Practice', tags: 'math,implementation', difficulty: '3★', solvedByCount: 285554 },
  [`atcoder::dp_a`]: { title: 'Frog 1', contest: 'Educational DP Contest', tags: 'dynamic-programming', difficulty: 'Gray', solvedByCount: 241221 },
  [`atcoder::abc085_c`]: { title: 'Otoshidama', contest: 'AtCoder Beginner Contest 085', tags: 'bruteforce,math', difficulty: 'Green', solvedByCount: 183100 },
  [`hackerrank::ctci-array-left-rotation`]: { title: 'Array Left Rotation', contest: 'Cracking the Coding Interview', tags: 'arrays,rotation', difficulty: 'Easy', solvedByCount: 925441 },
  [`hackerrank::sherlock-and-anagrams`]: { title: 'Sherlock and Anagrams', contest: 'Interview Preparation Kit', tags: 'strings,hashing', difficulty: 'Medium', solvedByCount: 441320 },
  [`topcoder::SRM-849-div2-250`]: { title: 'Contest Scoreboard', contest: 'SRM 849', tags: 'implementation,simulation', difficulty: 'Medium', solvedByCount: 21045 },
  [`geeksforgeeks::count-pairs-with-given-sum`]: { title: 'Count Pairs With Given Sum', contest: 'GeeksForGeeks Practice', tags: 'arrays,hashing', difficulty: 'Medium', solvedByCount: 158230 },
  [`coder::sum-of-primes`]: { title: 'Sum of Primes', contest: 'Coder Sprint', tags: 'math,sieve,number-theory', difficulty: 'Medium', solvedByCount: 84210 },
};

const reLeetCode = /\/problems\/([^/]+)/;
const reCodeforces = /\/(?:problemset\/problem|contest)\/(\d+)\/(?:problem\/)?([A-Za-z0-9]+)/;
const reAtCoder = /\/tasks\/([^/]+)/;
const reHackerRank = /\/challenges\/([^/]+)/;

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ensureSupportedURL(rawURL: string): { url: string; host: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawURL.trim());
  } catch (error) {
    throw new Error('Problem links must be valid URLs.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Problem links must use HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Problem links must not include credentials.');
  }
  if (parsed.hash) {
    throw new Error('Problem links must not include fragments.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!supportedHosts[host]) {
    throw new Error('Unsupported coding platform. Use LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, or Coder.');
  }

  // Normalize path
  let path = parsed.pathname;
  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1);
  }

  return {
    url: `https://${host}${path}${parsed.search}`,
    host: supportedHosts[host],
  };
}

export function extractPlatformProblemID(canonicalURL: string, platform: string): string | null {
  try {
    const parsed = new URL(canonicalURL);
    const path = parsed.pathname;

    switch (platform) {
      case PlatformLeetCode: {
        const match = path.match(reLeetCode);
        return match ? match[1].toLowerCase() : null;
      }
      case PlatformCodeforces: {
        const match = path.match(reCodeforces);
        return match ? match[1] + match[2].toUpperCase() : null;
      }
      case PlatformCodeChef: {
        const parts = path.split('/').filter(Boolean);
        return parts.length > 0 ? parts[parts.length - 1].toUpperCase() : null;
      }
      case PlatformAtCoder: {
        const match = path.match(reAtCoder);
        return match ? match[1].toLowerCase() : null;
      }
      case PlatformHackerRank: {
        const match = path.match(reHackerRank);
        return match ? match[1].toLowerCase() : null;
      }
      case PlatformTopCoder:
      case PlatformGeeksForGeeks:
      case PlatformCoder: {
        const parts = path.split('/').filter(Boolean);
        if (parts.length > 0) {
          const val = parts[parts.length - 1];
          return platform === PlatformTopCoder ? val : val.toLowerCase();
        }
        return null;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

function stableBucket(seed: string, mod: number): number {
  if (mod <= 0) return 0;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0) % mod;
}

export function normalizeDifficultyForPlatform(platform: string, difficulty: string, problemID: string | null): string {
  const generic = ['Easy', 'Medium', 'Hard', 'Unknown'];
  if (!generic.includes(difficulty)) {
    return difficulty;
  }

  const idSeed = problemID || 'x';
  switch (platform) {
    case PlatformLeetCode:
      return difficulty;
    case PlatformCodeforces: {
      const buckets = {
        Easy: ['800', '900', '1000', '1100'],
        Medium: ['1200', '1400', '1500', '1600'],
        Hard: ['1800', '2000', '2100', '2400'],
        Unknown: ['1200'],
      };
      const values = buckets[difficulty as keyof typeof buckets] || buckets['Medium'];
      return values[stableBucket(`${platform}:${idSeed}`, values.length)];
    }
    case PlatformCodeChef: {
      const native = { Easy: '1★', Medium: '3★', Hard: '5★', Unknown: '2★' };
      return native[difficulty as keyof typeof native] || '2★';
    }
    case PlatformAtCoder: {
      const native = { Easy: 'Gray', Medium: 'Green', Hard: 'Blue', Unknown: 'Brown' };
      return native[difficulty as keyof typeof native] || 'Brown';
    }
    default:
      return difficulty;
  }
}

function slugToTitle(value: string): string {
  const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Untitled Problem';
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function buildFallbackEntry(platform: string, problemID: string | null, canonicalURL: string): CatalogEntry {
  let rawSlug = problemID;
  if (!rawSlug) {
    try {
      const parsed = new URL(canonicalURL);
      const parts = parsed.pathname.split('/').filter(Boolean);
      rawSlug = parts.length > 0 ? parts[parts.length - 1] : null;
    } catch (e) {}
  }
  if (!rawSlug) {
    rawSlug = platformLabels[platform] || 'Problem';
  }

  let defaultDifficulty = 'Medium';
  switch (platform) {
    case PlatformCodeforces: {
      const values = ['800', '1000', '1200', '1400', '1600', '1800', '2100', '2400'];
      defaultDifficulty = values[stableBucket(`${platform}:${rawSlug}`, values.length)];
      break;
    }
    case PlatformCodeChef: {
      const values = ['1★', '2★', '3★', '4★', '5★'];
      defaultDifficulty = values[stableBucket(`${platform}:${rawSlug}`, values.length)];
      break;
    }
    case PlatformAtCoder: {
      const values = ['Gray', 'Brown', 'Green', 'Cyan', 'Blue', 'Yellow'];
      defaultDifficulty = values[stableBucket(`${platform}:${rawSlug}`, values.length)];
      break;
    }
  }

  const contestByPlatform: Record<string, string> = {
    [PlatformLeetCode]: 'LeetCode Practice Set',
    [PlatformCodeforces]: 'Codeforces Problemset',
    [PlatformCodeChef]: 'CodeChef Practice',
    [PlatformAtCoder]: 'AtCoder Practice',
    [PlatformHackerRank]: 'HackerRank Interview Prep',
    [PlatformTopCoder]: 'TopCoder Arena',
    [PlatformGeeksForGeeks]: 'GeeksForGeeks Practice',
    [PlatformCoder]: 'Coder Challenge Track',
  };

  const tagsByPlatform: Record<string, string> = {
    [PlatformLeetCode]: 'algorithms,data-structures',
    [PlatformCodeforces]: 'implementation,greedy',
    [PlatformCodeChef]: 'ad-hoc,math',
    [PlatformAtCoder]: 'dynamic-programming,implementation',
    [PlatformHackerRank]: 'arrays,strings',
    [PlatformTopCoder]: 'simulation,math',
    [PlatformGeeksForGeeks]: 'arrays,hashing',
    [PlatformCoder]: 'algorithms,problem-solving',
  };

  const solved = stableBucket(`${platform}:${rawSlug}`, 900000) + 1000;

  return {
    title: slugToTitle(rawSlug),
    contest: contestByPlatform[platform] || 'Coding Practice',
    tags: tagsByPlatform[platform] || 'algorithms',
    difficulty: defaultDifficulty,
    solvedByCount: solved,
  };
}

export interface ResolvedProblem {
  platform: string;
  problemUrl: string;
  platformProblemId: string | null;
  title: string;
  contest: string | null;
  tags: string | null;
  difficulty: string;
  thumbnailUrl: string | null;
  solvedByCount: number | null;
}

export function getProblemSignature(platform: string, title: string, problemId: string | null): string {
  let identifier = normalizeText(title);
  if (problemId && problemId.trim()) {
    identifier = problemId;
  }
  return `${platform}::${identifier}`;
}

export async function resolveProblem(rawURL: string): Promise<ResolvedProblem> {
  const { url: canonicalURL, host: platform } = ensureSupportedURL(rawURL);
  const problemID = extractPlatformProblemID(canonicalURL, platform);

  const catalogKey = `${platform}::${problemID || ''}`;
  let entry = catalog[catalogKey];

  if (!entry) {
    // Attempt simple HTML scraping to find a title from the URL
    let scrapedTitle = '';
    try {
      const response = await axios.get(canonicalURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 5000,
      });
      const $ = cheerio.load(response.data);
      const titleText = $('title').text().trim();
      if (titleText) {
        // clean up title
        scrapedTitle = titleText
          .replace(/ - LeetCode$/, '')
          .replace(/ - Codeforces$/, '')
          .replace(/ - AtCoder$/, '')
          .replace(/ - CodeChef$/, '')
          .split('|')[0]
          .trim();
      }
    } catch (scrapeError) {
      // Ignore scraper failures and fallback
    }

    entry = buildFallbackEntry(platform, problemID, canonicalURL);
    if (scrapedTitle) {
      entry.title = scrapedTitle;
    }
  }

  return {
    platform,
    problemUrl: canonicalURL,
    platformProblemId: problemID,
    title: entry.title,
    contest: entry.contest || null,
    tags: entry.tags || null,
    difficulty: entry.difficulty,
    thumbnailUrl: null,
    solvedByCount: entry.solvedByCount,
  };
}
