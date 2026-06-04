import type {
  Analytics,
  AuthResponse,
  Challenge,
  Friend,
  FriendLookupResponse,
  FriendRequest,
  GlobalStatsResponse,
  GroupSummary,
  JoinRequestItem,
  Problem,
  TopGroup,
  User,
} from "@/lib/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "algosphere-auth-token";

export type ApiIssue = {
  path: string[];
  message: string;
};

export class ApiError extends Error {
  status: number;
  issues: ApiIssue[];
  detail: unknown;

  constructor(message: string, options: { status: number; issues?: ApiIssue[]; detail?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.issues = options.issues ?? [];
    this.detail = options.detail;
  }
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

const toCamelCase = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toCamelCase);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(nestedValue);
      return acc;
    }, {});
  }

  return value;
};

const toApiIssues = (detail: unknown): ApiIssue[] => {
  if (!Array.isArray(detail)) {
    return [];
  }

  return detail.flatMap((entry): ApiIssue[] => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const message = typeof entry.msg === "string" ? entry.msg : null;
    const path = Array.isArray(entry.loc)
      ? entry.loc.filter((part): part is string => typeof part === "string")
      : [];

    if (!message) {
      return [];
    }

    return [{ path, message }];
  });
};

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const setStoredToken = (token: string | null) => {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      "We couldn't reach AlgoArena. Check your internet connection or make sure the backend is running, then try again.",
      {
        status: 0,
        detail: error,
      }
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const issues = toApiIssues(payload?.detail);
    const message =
      typeof payload?.detail === "string"
        ? payload.detail
        : issues[0]?.message ?? "The request could not be completed. Please try again.";
    throw new ApiError(message, {
      status: response.status,
      issues,
      detail: payload?.detail,
    });
  }

  return toCamelCase(payload) as T;
}

export const api = {
  login: (input: { identifier: string; password: string }) =>
    apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    }),
  checkUsername: (username: string) =>
    apiRequest<{ available: boolean }>(
      `/api/auth/check-username?username=${encodeURIComponent(username)}`,
      { skipAuth: true },
    ),
  register: (input: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    favoriteTopic?: string;
    favoritePlatform?: string;
  }) =>
    apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    }),
  googleAuth: (code: string, redirectUri?: string) =>
    apiRequest<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ code, redirectUri }),
      skipAuth: true,
    }),
  me: () => apiRequest<User>("/api/auth/me"),
  getProfile: () => apiRequest<User>("/api/profile"),
  updateProfile: (input: {
    displayName: string;
    bio: string;
    favoriteTopic?: string | null;
    favoritePlatform?: string | null;
    avatarUrl?: string | null;
    leetcodeHandle?: string | null;
    codeforcesHandle?: string | null;
    codechefHandle?: string | null;
    atcoderHandle?: string | null;
  }) =>
    apiRequest<User>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  listGroups: () => apiRequest<GroupSummary[]>("/api/groups"),
  createGroup: (input: { name: string; memberIds: number[] }) =>
    apiRequest<GroupSummary>("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: input.name, member_ids: input.memberIds }),
    }),
  addGroupMembers: (groupId: number, memberIds: number[]) =>
    apiRequest<GroupSummary>(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ member_ids: memberIds }),
    }),
  removeGroupMember: (groupId: number, userId: number) =>
    apiRequest<void>(`/api/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    }),
  removeGroupProblem: (groupId: number, problemId: number) =>
    apiRequest<void>(`/api/groups/${groupId}/problems/${problemId}`, {
      method: "DELETE",
    }),
  deleteGroup: (groupId: number) =>
    apiRequest<void>(`/api/groups/${groupId}`, {
      method: "DELETE",
    }),
  listGroupProblems: (groupId: number) => apiRequest<Problem[]>(`/api/groups/${groupId}/problems`),
  getProblemsFeed: () => apiRequest<Problem[]>("/api/problems/feed"),
  addProblem: (groupId: number, url: string) =>
    apiRequest<Problem>(`/api/groups/${groupId}/problems`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  getGroupAnalytics: (groupId: number, window: string) =>
    apiRequest<Analytics>(`/api/groups/${groupId}/analytics?window=${encodeURIComponent(window)}`),
  getPersonalAnalytics: (window: string) =>
    apiRequest<Analytics>(`/api/analytics/me?window=${encodeURIComponent(window)}`),
  lookupUserByUsername: async (username: string) => {
    const response = await apiRequest<FriendLookupResponse>(
      `/api/friends/lookup?username=${encodeURIComponent(username)}`
    );
    return response.user;
  },
  searchUsers: (q: string) =>
    apiRequest<Friend[]>(`/api/friends/search?q=${encodeURIComponent(q)}`),
  listFriends: () => apiRequest<Friend[]>("/api/friends/list"),
  addFriend: (friendId: number) =>
    apiRequest<Friend>(`/api/friends/${friendId}`, {
      method: "POST",
    }),
  removeFriend: (friendId: number) =>
    apiRequest<void>(`/api/friends/${friendId}`, {
      method: "DELETE",
    }),
  listFriendRequests: () => apiRequest<FriendRequest[]>("/api/friends/requests"),
  acceptFriendRequest: (requestId: number) =>
    apiRequest<Friend>(`/api/friends/requests/${requestId}/accept`, {
      method: "POST",
    }),
  rejectFriendRequest: (requestId: number) =>
    apiRequest<void>(`/api/friends/requests/${requestId}/reject`, {
      method: "POST",
    }),
  getTopGroups: () => apiRequest<TopGroup[]>("/api/groups/top"),
  requestJoinGroup: (groupId: number) =>
    apiRequest<{ status: string }>(`/api/groups/${groupId}/request-join`, {
      method: "POST",
    }),
  listJoinRequests: () => apiRequest<JoinRequestItem[]>("/api/groups/join-requests"),
  acceptJoinRequest: (requestId: number) =>
    apiRequest<{ status: string }>(`/api/groups/join-requests/${requestId}/accept`, {
      method: "POST",
    }),
  rejectJoinRequest: (requestId: number) =>
    apiRequest<{ status: string }>(`/api/groups/join-requests/${requestId}/reject`, {
      method: "POST",
    }),
  getGlobalStats: () =>
    apiRequest<GlobalStatsResponse>("/api/stats", {
      skipAuth: true,
    }),
  listChallenges: () => apiRequest<Challenge[]>("/api/challenges"),
  getChallenge: (id: number) => apiRequest<Challenge>(`/api/challenges/${id}`),
  createChallenge: (input: {
    title: string;
    platform: string;
    numProblems: number;
    minRating: number;
    maxRating: number;
    tags: string[];
    inviteUserIds: number[];
  }) =>
    apiRequest<Challenge>("/api/challenges", {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        platform: input.platform,
        num_problems: input.numProblems,
        min_rating: input.minRating,
        max_rating: input.maxRating,
        tags: input.tags,
        invite_user_ids: input.inviteUserIds,
      }),
    }),
  acceptChallenge: (id: number) =>
    apiRequest<Challenge>(`/api/challenges/${id}/accept`, { method: "POST" }),
  declineChallenge: (id: number) =>
    apiRequest<void>(`/api/challenges/${id}/decline`, { method: "POST" }),
  startChallenge: (id: number) =>
    apiRequest<Challenge>(`/api/challenges/${id}/start`, { method: "POST" }),
};
