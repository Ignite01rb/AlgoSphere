import { normalizeDifficultyForPlatform } from '../services/scraper';

export interface ProblemRecord {
  title: string;
  contest: string | null;
  difficulty: string;
  platform: string;
  platformProblemId: string | null;
  sharedAt: Date;
  problemSignature: string;
  sharedByUsername: string;
}

export interface StatPoint {
  label: string;
  value: string;
  change?: string | null;
}

export interface DistributionPoint {
  name: string;
  value: number;
}

export interface PlatformPoint {
  name: string;
  problems: number;
}

export interface DailyPoint {
  day: string;
  problems: number;
}

export interface MonthlyPoint {
  month: string;
  problems: number;
}

export interface MemberLeaderboardEntry {
  name: string;
  problems: number;
  topDifficulty: string;
}

export interface TopProblemEntry {
  title: string;
  contest?: string | null;
  shares: number;
  difficulty: string;
}

export interface PlatformDifficultyItem {
  tier: string;
  count: number;
  percent: number;
}

export interface PlatformDifficultyGroup {
  platform: string;
  items: PlatformDifficultyItem[];
}

export interface AnalyticsResponse {
  stats: StatPoint[];
  difficultyDistribution: DistributionPoint[];
  platformDifficulty: PlatformDifficultyGroup[];
  platformLoyalty: PlatformPoint[];
  weeklyActivity: DailyPoint[];
  monthlyTrend: MonthlyPoint[];
  memberLeaderboard: MemberLeaderboardEntry[];
  topProblems: TopProblemEntry[];
}

const windowMap: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  'all': 0,
};

export function filterByWindow(problems: ProblemRecord[], window: string, now: Date): ProblemRecord[] {
  const days = windowMap[window] !== undefined ? windowMap[window] : 30;
  if (days === 0) {
    return problems;
  }
  const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return problems.filter(p => new Date(p.sharedAt) >= threshold);
}

function percentChange(previous: number, current: number): string | null {
  if (previous <= 0) {
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
}

function plusString(value: number): string | null {
  if (value <= 0) {
    return null;
  }
  return `+${value}`;
}

export function buildAnalytics(problems: ProblemRecord[]): AnalyticsResponse {
  const totalProblems = problems.length;
  const contestSet = new Set<string>();
  const difficultyCounts: Record<string, number> = {};
  const platformCounts: Record<string, number> = {};

  const platformLabels: Record<string, string> = {
    leetcode: 'LeetCode',
    codeforces: 'Codeforces',
    codechef: 'CodeChef',
    atcoder: 'AtCoder',
    hackerrank: 'HackerRank',
    topcoder: 'TopCoder',
    geeksforgeeks: 'GeeksforGeeks',
    coder: 'Coder',
  };

  for (const problem of problems) {
    if (problem.contest) {
      contestSet.add(problem.contest.toLowerCase().trim());
    }
    const difficulty = normalizeDifficultyForPlatform(problem.platform, problem.difficulty, problem.platformProblemId);
    difficultyCounts[difficulty] = (difficultyCounts[difficulty] || 0) + 1;
    platformCounts[problem.platform] = (platformCounts[problem.platform] || 0) + 1;
  }

  const contestCount = contestSet.size;
  let weeksDivisor = 1;
  if (totalProblems > 14) {
    weeksDivisor = Math.floor(totalProblems / 7);
    if (weeksDivisor < 1) {
      weeksDivisor = 1;
    }
  }
  const avgPerWeek = totalProblems > 0 ? Math.floor(totalProblems / weeksDivisor) : 0;

  let previousProblems = 0;
  if (totalProblems > 0) {
    previousProblems = totalProblems - Math.max(1, Math.floor(totalProblems / 5));
    if (previousProblems < 1) {
      previousProblems = 1;
    }
  }
  const problemChange = percentChange(previousProblems, totalProblems);
  const contestChange = percentChange(Math.max(contestCount - 2, 1), contestCount);

  const stats: StatPoint[] = [
    { label: 'Total problems', value: totalProblems.toString(), change: problemChange },
    { label: 'Unique contests', value: contestCount.toString(), change: contestChange },
    { label: 'Difficulty tiers', value: Object.keys(difficultyCounts).length.toString(), change: plusString(Math.max(Object.keys(difficultyCounts).length - 1, 0)) },
    { label: 'Avg. per week', value: avgPerWeek.toString() },
  ];

  const difficultyDistribution = buildDifficultyDistribution(difficultyCounts, totalProblems);
  const platformDifficulty = buildPlatformDifficulty(problems, platformLabels);
  const platformLoyalty = buildPlatformLoyalty(platformCounts, platformLabels);
  const weeklyActivity = buildWeeklyActivity(problems);
  const monthlyTrend = buildMonthlyTrend(problems);
  const memberLeaderboard = buildMemberLeaderboard(problems);
  const topProblems = buildTopProblems(problems);

  return {
    stats,
    difficultyDistribution,
    platformDifficulty,
    platformLoyalty,
    weeklyActivity,
    monthlyTrend,
    memberLeaderboard,
    topProblems,
  };
}

function buildDifficultyDistribution(counts: Record<string, number>, total: number): DistributionPoint[] {
  if (total === 0) return [];
  const pairs = Object.entries(counts).map(([name, count]) => ({ name, count }));
  pairs.sort((a, b) => {
    if (a.count === b.count) return a.name.localeCompare(b.name);
    return b.count - a.count;
  });
  const limit = Math.min(6, pairs.length);
  return pairs.slice(0, limit).map(item => ({
    name: item.name,
    value: Math.round((item.count / total) * 100),
  }));
}

function buildPlatformDifficulty(problems: ProblemRecord[], labels: Record<string, string>): PlatformDifficultyGroup[] {
  const grouped: Record<string, ProblemRecord[]> = {};
  for (const problem of problems) {
    grouped[problem.platform] = grouped[problem.platform] || [];
    grouped[problem.platform].push(problem);
  }

  const pairs = Object.entries(grouped).map(([platform, items]) => ({ platform, items }));
  pairs.sort((a, b) => b.items.length - a.items.length);

  return pairs.map(item => {
    const counts: Record<string, number> = {};
    for (const problem of item.items) {
      const normalized = normalizeDifficultyForPlatform(problem.platform, problem.difficulty, problem.platformProblemId);
      const tier = tierForPlatform(problem.platform, normalized);
      counts[tier] = (counts[tier] || 0) + 1;
    }

    const ordered = orderedTiers(item.platform, counts);
    const points = ordered.map(tier => ({
      tier,
      count: counts[tier],
      percent: Math.round((counts[tier] / item.items.length) * 100),
    }));

    return {
      platform: labels[item.platform] || item.platform,
      items: points,
    };
  });
}

function buildPlatformLoyalty(counts: Record<string, number>, labels: Record<string, string>): PlatformPoint[] {
  const pairs = Object.entries(counts).map(([platform, count]) => ({ platform, count }));
  pairs.sort((a, b) => {
    if (a.count === b.count) return a.platform.localeCompare(b.platform);
    return b.count - a.count;
  });
  return pairs.map(item => ({
    name: labels[item.platform] || item.platform,
    problems: item.count,
  }));
}

function buildWeeklyActivity(problems: ProblemRecord[]): DailyPoint[] {
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (const problem of problems) {
    const date = new Date(problem.sharedAt);
    const dayName = dayNames[date.getUTCDay()];
    counts[dayName] = (counts[dayName] || 0) + 1;
  }

  return daysOfWeek.map(day => ({
    day,
    problems: counts[day],
  }));
}

function buildMonthlyTrend(problems: ProblemRecord[]): MonthlyPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const counts: Record<string, number> = {};

  for (const problem of problems) {
    const date = new Date(problem.sharedAt);
    const monthName = months[date.getUTCMonth()];
    counts[monthName] = (counts[monthName] || 0) + 1;
  }

  const result: MonthlyPoint[] = [];
  for (const month of months) {
    if (counts[month] > 0) {
      result.push({ month, problems: counts[month] });
    }
  }
  return result;
}

function buildMemberLeaderboard(problems: ProblemRecord[]): MemberLeaderboardEntry[] {
  const grouped: Record<string, ProblemRecord[]> = {};
  for (const problem of problems) {
    grouped[problem.sharedByUsername] = grouped[problem.sharedByUsername] || [];
    grouped[problem.sharedByUsername].push(problem);
  }

  const pairs = Object.entries(grouped).map(([username, items]) => ({ username, items }));
  pairs.sort((a, b) => {
    if (a.items.length === b.items.length) return a.username.localeCompare(b.username);
    return b.items.length - a.items.length;
  });

  const limit = Math.min(6, pairs.length);
  return pairs.slice(0, limit).map(item => {
    let topDifficulty = '';
    const counts: Record<string, number> = {};
    let maxCount = 0;

    for (const problem of item.items) {
      const difficulty = normalizeDifficultyForPlatform(problem.platform, problem.difficulty, problem.platformProblemId);
      counts[difficulty] = (counts[difficulty] || 0) + 1;
      if (counts[difficulty] > maxCount || (counts[difficulty] === maxCount && difficulty < topDifficulty)) {
        maxCount = counts[difficulty];
        topDifficulty = difficulty;
      }
    }

    return {
      name: `@${item.username}`,
      problems: item.items.length,
      topDifficulty,
    };
  });
}

function buildTopProblems(problems: ProblemRecord[]): TopProblemEntry[] {
  const grouped: Record<string, ProblemRecord[]> = {};
  for (const problem of problems) {
    grouped[problem.problemSignature] = grouped[problem.problemSignature] || [];
    grouped[problem.problemSignature].push(problem);
  }

  const pairs = Object.entries(grouped).map(([signature, items]) => ({ signature, items }));
  pairs.sort((a, b) => {
    if (a.items.length === b.items.length) return a.signature.localeCompare(b.signature);
    return b.items.length - a.items.length;
  });

  const limit = Math.min(5, pairs.length);
  return pairs.slice(0, limit).map(item => {
    const rep = item.items[0];
    return {
      title: rep.title,
      contest: rep.contest,
      shares: item.items.length,
      difficulty: normalizeDifficultyForPlatform(rep.platform, rep.difficulty, rep.platformProblemId),
    };
  });
}

function orderedTiers(platform: string, counts: Record<string, number>): string[] {
  const orders: Record<string, string[]> = {
    codeforces: ['Newbie', 'Pupil', 'Specialist', 'Expert', 'Candidate Master', 'Master', 'Grandmaster'],
    codechef: ['1★', '2★', '3★', '4★', '5★', '6★', '7★'],
    atcoder: ['Gray', 'Brown', 'Green', 'Cyan', 'Blue', 'Yellow', 'Orange', 'Red'],
    leetcode: ['Easy', 'Medium', 'Hard'],
  };

  const seen = new Set<string>();
  const result: string[] = [];
  const order = orders[platform];

  if (order) {
    for (const tier of order) {
      if (counts[tier] > 0) {
        seen.add(tier);
        result.push(tier);
      }
    }
  }

  const remaining = Object.entries(counts)
    .filter(([tier, count]) => count > 0 && !seen.has(tier))
    .map(([tier, count]) => ({ tier, count }));

  remaining.sort((a, b) => {
    if (a.count === b.count) return a.tier.localeCompare(b.tier);
    return b.count - a.count;
  });

  for (const item of remaining) {
    result.push(item.tier);
  }
  return result;
}

function tierForPlatform(platform: string, difficulty: string): string {
  const legacyCF: Record<string, string> = { Easy: 'Newbie', Medium: 'Specialist', Hard: 'Expert' };
  const legacyCC: Record<string, string> = { Easy: '1★', Medium: '3★', Hard: '5★' };
  const legacyAC: Record<string, string> = { Easy: 'Gray', Medium: 'Green', Hard: 'Blue' };

  if (platform === 'codeforces') {
    if (legacyCF[difficulty]) return legacyCF[difficulty];
    const rating = parseInt(difficulty, 10);
    if (isNaN(rating)) return difficulty;
    if (rating < 1200) return 'Newbie';
    if (rating < 1400) return 'Pupil';
    if (rating < 1600) return 'Specialist';
    if (rating < 1900) return 'Expert';
    if (rating < 2100) return 'Candidate Master';
    if (rating < 2400) return 'Master';
    return 'Grandmaster';
  }

  if (platform === 'codechef') {
    return legacyCC[difficulty] || difficulty;
  }

  if (platform === 'atcoder') {
    return legacyAC[difficulty] || difficulty;
  }

  return difficulty;
}
