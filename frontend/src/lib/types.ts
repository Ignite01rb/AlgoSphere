export type User = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  favoriteTopic?: string | null;
  favoritePlatform?: string | null;
  avatarUrl?: string | null;
  leetcodeHandle?: string | null;
  codeforcesHandle?: string | null;
  codechefHandle?: string | null;
  atcoderHandle?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  user: User;
};

export type Friend = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isFriend: boolean;
  friendshipStatus: "none" | "pending_outgoing" | "pending_incoming" | "accepted";
};

export type FriendLookupResponse = {
  user: Friend | null;
};

export type FriendRequest = {
  id: number;
  fromUser: Friend;
  createdAt: string;
};

export type GroupSummary = {
  id: number;
  name: string;
  memberCount: number;
  problemCount: number;
  lastActiveAt?: string | null;
  members: string[];
  memberDetails?: { id: number; username: string }[];
  isOwner?: boolean;
};

export type Problem = {
  id: number | string;
  title: string;
  contest?: string | null;
  tags?: string | null;
  difficulty: string;
  url: string;
  platform: string;
  sharedBy: string;
  thumbnailUrl?: string | null;
  solvedByCount?: number | null;
  sharedAt: string;
};

export type StatPoint = {
  label: string;
  value: string;
  change?: string | null;
};

export type DistributionPoint = {
  name: string;
  value: number;
};

export type PlatformPoint = {
  name: string;
  problems: number;
};

export type DailyPoint = {
  day: string;
  problems: number;
};

export type MonthlyPoint = {
  month: string;
  problems: number;
};

export type MemberLeaderboardEntry = {
  name: string;
  problems: number;
  topDifficulty: string;
};

export type TopProblemEntry = {
  title: string;
  contest?: string | null;
  shares: number;
  difficulty: string;
};

export type GlobalStatsResponse = {
  groupsCreated: number;
  problemsShared: number;
  activeMembers: number;
};

export type PlatformDifficultyItem = {
  tier: string;
  count: number;
  percent: number;
};

export type PlatformDifficultyGroup = {
  platform: string;
  items: PlatformDifficultyItem[];
};

export type ChallengeProblem = {
  id: number;
  problemUrl: string;
  title: string;
  contestId?: number | null;
  problemIndex?: string | null;
  rating?: number | null;
  tags?: string | null;
  orderIndex: number;
};

export type ChallengeParticipant = {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
};

export type Challenge = {
  id: number;
  title: string;
  platform: string;
  numProblems: number;
  minRating?: number | null;
  maxRating?: number | null;
  tags?: string | null;
  status: string;
  createdBy: string;
  createdById: number;
  participants: ChallengeParticipant[];
  problems: ChallengeProblem[];
  createdAt: string;
  startedAt?: string | null;
};

export type TopGroup = {
  id: number;
  name: string;
  memberCount: number;
  problemCount: number;
  lastActiveAt?: string | null;
  ownerUsername: string;
  joinStatus: string | null;
};

export type JoinRequestItem = {
  id: number;
  groupId: number;
  groupName: string;
  userId: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
  createdAt: string;
};

export type Analytics = {
  stats: StatPoint[];
  difficultyDistribution: DistributionPoint[];
  platformDifficulty: PlatformDifficultyGroup[];
  platformLoyalty: PlatformPoint[];
  weeklyActivity: DailyPoint[];
  monthlyTrend: MonthlyPoint[];
  memberLeaderboard: MemberLeaderboardEntry[];
  topProblems: TopProblemEntry[];
};
