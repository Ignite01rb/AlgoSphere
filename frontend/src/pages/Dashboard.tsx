import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Code2, FlaskConical, Users2, Bell, Settings, ArrowRight, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddProblemInput } from "@/components/AddProblemInput";
import { ProblemCard } from "@/components/ProblemCard";
import { ProblemDetailsModal } from "@/components/ProblemDetailsModal";
import type { Group } from "@/components/GroupCard";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAppContext } from "@/lib/app-context";
import { formatRelativeTime } from "@/lib/format";
import type { Problem } from "@/lib/types";
import { useGroupNotifications } from "@/hooks/use-group-notifications";


const Dashboard = () => {
  const { user } = useAuth();
  const { activeGroup, setActiveGroup, setShowDiscover, activeTab, setActiveTab } = useAppContext();
  const [filterText, setFilterText] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: api.listGroups,
  });

  useEffect(() => {
    if (!groupsQuery.data?.length) {
      setActiveGroup(null);
      return;
    }

    const hasActive = groupsQuery.data.some((group) => group.id === activeGroup);
    if (!activeGroup || !hasActive) {
      setActiveGroup(groupsQuery.data[0].id);
    }
  }, [activeGroup, groupsQuery.data, setActiveGroup]);

  useEffect(() => {
    setSelectedProblem(null);
  }, [activeGroup]);

  const problemsQuery = useQuery({
    queryKey: ["group", activeGroup, "problems"],
    queryFn: () => api.listGroupProblems(activeGroup as number),
    enabled: Boolean(activeGroup),
    refetchInterval: 30_000,
  });

  const analyticsQuery = useQuery({
    queryKey: ["group", activeGroup, "analytics", "30d"],
    queryFn: () => api.getGroupAnalytics(activeGroup as number, "30d"),
    enabled: Boolean(activeGroup),
  });

  const friendsQuery = useQuery({
    queryKey: ["friendsList"],
    queryFn: api.listFriends,
    enabled: Boolean(activeGroup),
  });

  const addProblemMutation = useMutation({
    mutationFn: (url: string) => api.addProblem(activeGroup as number, url),
    onSuccess: () => {
      toast.success("Problem added to the feed");
      void queryClient.invalidateQueries({ queryKey: ["group", activeGroup] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Problem lookup failed.");
    },
  });

  const deleteProblemMutation = useMutation({
    mutationFn: (problemId: number) => api.removeGroupProblem(activeGroup as number, problemId),
    onSuccess: () => {
      toast.success("Problem removed from the squad");
      void queryClient.invalidateQueries({ queryKey: ["group", activeGroup] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove problem");
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (memberId: number) => api.addGroupMembers(Number(activeGroup), [memberId]),
    onSuccess: () => {
      toast.success("Member added to squad");
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: () => {
      toast.error("Failed to add member to squad");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => api.removeGroupMember(Number(activeGroup), userId),
    onSuccess: (_, userId) => {
      if (userId === user?.id) {
        toast.success("You left the squad");
        setActiveGroup(null);
      } else {
        toast.success("Member removed from squad");
      }
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to remove member");
    },
  });

  const activeGroupSummary = groupsQuery.data?.find((group) => group.id === activeGroup) ?? null;
  const problems = (problemsQuery.data ?? []).map(
    (problem): Problem => ({
      id: problem.id,
      title: problem.title,
      contest: problem.contest ?? undefined,
      tags: problem.tags ?? undefined,
      difficulty: problem.difficulty,
      url: problem.url,
      platform: problem.platform,
      sharedBy: problem.sharedBy,
      thumbnailUrl: problem.thumbnailUrl ?? undefined,
      solvedByCount: problem.solvedByCount ?? undefined,
      sharedAt: problem.sharedAt,
    })
  );

  const filteredProblems = useMemo(() => {
    let result = problems;
    
    if (platformFilter !== "all") {
      result = result.filter((p) => p.platform.toLowerCase() === platformFilter.toLowerCase());
    }
    
    if (difficultyFilter !== "all") {
      result = result.filter((p) => p.difficulty.toLowerCase() === difficultyFilter.toLowerCase());
    }

    if (filterText.trim()) {
      const lower = filterText.toLowerCase();
      result = result.filter(
        (problem) =>
          problem.title.toLowerCase().includes(lower) ||
          (problem.contest ?? "").toLowerCase().includes(lower) ||
          problem.sharedBy.toLowerCase().includes(lower) ||
          problem.difficulty.toLowerCase().includes(lower) ||
          problem.platform.toLowerCase().includes(lower) ||
          (problem.tags ?? "").toLowerCase().includes(lower)
      );
    }
    
    return result;
  }, [problems, filterText, platformFilter, difficultyFilter]);

  useGroupNotifications(problems, activeGroupSummary?.name ?? null, activeGroup);

  const chartData = analyticsQuery.data;
  const weeklyTotal = chartData?.weeklyActivity.reduce((sum, entry) => sum + entry.problems, 0) ?? 0;

  // Build member items list
  const membersList = activeGroupSummary?.memberDetails || activeGroupSummary?.members.map(m => ({ id: 0, username: m })) || [];
  
  // Determine list of friends who are not yet in the squad
  const groupMembersUsernames = activeGroupSummary?.members || [];
  const friendsToInvite = (friendsQuery.data ?? []).filter(
    (friend) => !groupMembersUsernames.includes(friend.username)
  );



  // Leaderboard / Performers list logic (sort members by problems solved in current feed)
  const performers = useMemo(() => {
    const counts: Record<string, number> = {};
    problems.forEach((p) => {
      counts[p.sharedBy] = (counts[p.sharedBy] || 0) + 1;
    });

    const totalProblems = problems.length || 1;
    
    return membersList.map((member) => {
      const solveCount = counts[member.username] || 0;
      const percentage = Math.round((solveCount / totalProblems) * 100);
      return {
        id: member.id,
        username: member.username,
        displayName: member.username,
        solveCount,
        percentage: solveCount > 0 ? percentage : 0,
      };
    }).sort((a, b) => b.solveCount - a.solveCount).slice(0, 3);
  }, [problems, membersList]);

  // Concentric circle SVG values
  const strokeOuter = 2 * Math.PI * 26;
  const strokeMid = 2 * Math.PI * 20;
  const strokeInner = 2 * Math.PI * 14;

  // Calculate dynamic percentages for the weekly gauges
  const easyCount = problems.filter(p => p.difficulty.toLowerCase() === "easy").length;
  const mediumCount = problems.filter(p => p.difficulty.toLowerCase() === "medium").length;
  const totalCount = problems.length || 1;
  const easyPercent = problems.length ? Math.round((easyCount / totalCount) * 100) : 0;
  const mediumPercent = problems.length ? Math.round((mediumCount / totalCount) * 100) : 0;
  const goalPercent = Math.min(Math.round((weeklyTotal / 10) * 100), 100); // 10 solves as a mock goal baseline

  const circ = 2 * Math.PI * 26;
  const goalOffset = circ * (1 - goalPercent / 100);
  const easyOffset = circ * (1 - easyPercent / 100);
  const mediumOffset = circ * (1 - mediumPercent / 100);

  return (
    <div className="w-full h-full overflow-hidden bg-transparent">
      <main className="w-full h-full overflow-y-auto px-8 py-6 space-y-6 scrollbar-thin">
        <div className="w-full space-y-6">
          {/* Mobile-only Squad Switcher */}
          <div className="md:hidden flex flex-col gap-2.5 p-4 rounded-xl border border-border/40 bg-secondary/25">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
              Active Squad
            </span>
            <select
              value={activeGroup ?? ""}
              onChange={(event) => setActiveGroup(event.target.value ? Number(event.target.value) : null)}
              className="w-full bg-background border border-border/60 text-xs font-semibold px-3 py-2 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select Squad Context</option>
              {groupsQuery.data?.map((group) => (
                <option key={group.id} value={group.id}>
                  @{group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title Header with synced detail and live status pill */}
          {activeGroup && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-left">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">
                  Dashboard
                </h1>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {activeGroupSummary?.name || "raahgav"}'s Squad · synced just now
                </p>
              </div>

              <div className="flex items-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Live
                </span>
              </div>
            </div>
          )}

          {activeGroup ? (
            <div className="space-y-6">
              {activeTab === "overview" ? (
                /* Premium Dashboard Hub Overview */
                <div className="space-y-6 text-left">
                  {/* Metric Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Shared Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-32">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50" />
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-mono tracking-wider font-bold">Shared</span>
                      </div>
                      <div className="my-1">
                        <p className="text-4xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
                          {activeGroupSummary?.problemCount || 0}
                        </p>
                      </div>
                      <div className="border-t border-border/40 dark:border-white/5 pt-1.5">
                        <p className="text-[10px] text-muted-foreground">Problems shared this week</p>
                      </div>
                    </div>

                    {/* Members Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-32">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-mono tracking-wider font-bold">Members</span>
                      </div>
                      <div className="my-1">
                        <p className="text-4xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
                          {activeGroupSummary?.memberCount || 0}
                        </p>
                      </div>
                      <div className="pt-1.5 flex flex-col gap-1.5">
                        <p className="text-[10px] text-muted-foreground">Active squad members</p>
                        {/* Custom blue progress bar indicator */}
                        <div className="w-full h-1 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: "35%" }} />
                        </div>
                      </div>
                    </div>

                    {/* Weekly Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-32">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-mono tracking-wider font-bold">Weekly</span>
                      </div>
                      <div className="my-1">
                        <p className="text-4xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
                          {weeklyTotal}
                        </p>
                      </div>
                      <div className="border-t border-border/40 dark:border-white/5 pt-1.5">
                        <p className="text-[10px] text-muted-foreground">Problems solved this week</p>
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Left column (Roster and Feed) & Right column (Grind and Progress) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Left side: Performers and Workspace Feed stacked */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                      {/* Top Performers Card */}
                      <div className="bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col justify-between text-left">
                        <div className="space-y-4 w-full">
                          <div className="flex items-center justify-between pb-2 border-b border-border/40 dark:border-white/5">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-widest">Top Performers</h3>
                            <button 
                              onClick={() => setActiveTab("members")}
                              className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest inline-flex items-center gap-1 cursor-pointer"
                            >
                              View roster <span className="text-xs">↗</span>
                            </button>
                          </div>
                          <div className="space-y-3.5 mt-2">
                            {performers.length === 0 ? (
                              <div className="text-center text-[10px] text-muted-foreground py-8 font-mono">
                                No solve records in feed.
                              </div>
                            ) : (
                              performers.map((performer, idx) => (
                                <div key={performer.username} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-muted-foreground/60 w-4">#{idx + 1}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                                      idx === 0 ? "bg-red-500" :
                                      idx === 1 ? "bg-blue-600" :
                                      "bg-amber-500"
                                    }`}>
                                      {performer.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className="font-bold text-foreground block">@{performer.username}</span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        {performer.solveCount} solved · {idx === 0 ? "LeetCode" : "Codeforces"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 w-1/3 justify-end">
                                    <div className="w-16 h-1.5 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden hidden sm:block">
                                      <div className={`h-full ${
                                        idx === 0 ? "bg-red-500" :
                                        idx === 1 ? "bg-blue-600" :
                                        "bg-amber-500"
                                      }`} style={{ width: `${performer.percentage || 10}%` }} />
                                    </div>
                                    <span className="font-mono font-bold text-foreground w-8 text-right">{performer.percentage}%</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="border-t border-border/40 dark:border-white/5 mt-4 pt-3 text-center">
                          <button 
                            onClick={() => setActiveTab("members")}
                            className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest inline-flex items-center gap-1 cursor-pointer"
                          >
                            View full roster <span className="text-xs">↗</span>
                          </button>
                        </div>
                      </div>

                      {/* Problems Feed Card */}
                      <div className="bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-6 shadow-sm text-left space-y-6">
                        <div className="flex items-center justify-between pb-2 border-b border-border/40 dark:border-white/5">
                          <div className="flex flex-col gap-0.5">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-widest">Collaborative Workspace Feed</h3>
                            <p className="text-[11px] text-muted-foreground">Submit problem URLs from LeetCode, Codeforces, or AtCoder to share with your squad</p>
                          </div>
                          <div className="w-6 h-6 border border-border/80 dark:border-white/20 rounded flex items-center justify-center text-muted-foreground">
                            <span className="text-xs font-mono">⛶</span>
                          </div>
                        </div>
                        
                        <AddProblemInput onSubmit={(url) => addProblemMutation.mutateAsync(url).then(() => undefined)} />

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between px-1 py-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                              Recent Shared Feed
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 hover:bg-transparent cursor-pointer ${
                                showFilter ? "text-primary" : "text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => {
                                setShowFilter(!showFilter);
                                if (showFilter) setFilterText("");
                              }}
                              title="Filter problems"
                            >
                              <Filter className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <AnimatePresence>
                            {showFilter && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-3 pb-3 pt-1 overflow-hidden"
                              >
                                <Input
                                  placeholder="Filter by title, contest, @username, difficulty, tags, or platform..."
                                  value={filterText}
                                  onChange={(event) => setFilterText(event.target.value)}
                                  className="h-8 text-xs bg-secondary/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50"
                                  autoFocus
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Filter Pills */}
                          <div className="flex flex-col gap-2.5 px-1 py-1.5 border-b border-border/10 pb-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                              {/* Platform filters */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold mr-0.5">Platform:</span>
                                {[
                                  { label: "All", value: "all" },
                                  { label: "LeetCode", value: "leetcode" },
                                  { label: "Codeforces", value: "codeforces" },
                                  { label: "AtCoder", value: "atcoder" },
                                ].map((p) => {
                                  const active = platformFilter === p.value;
                                  return (
                                    <button
                                      key={p.value}
                                      onClick={() => setPlatformFilter(p.value)}
                                      className={`px-3 py-0.5 text-[10px] rounded-full border transition-all cursor-pointer font-medium select-none ${
                                        active
                                          ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                                          : "bg-transparent hover:bg-secondary/20 text-muted-foreground border-border/80 dark:border-white/10"
                                      }`}
                                    >
                                      {p.label}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Divider for larger screens */}
                              <div className="hidden sm:block h-3.5 w-px bg-border/20" />

                              {/* Difficulty filters */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold mr-0.5">Difficulty:</span>
                                {[
                                  { label: "All", value: "all" },
                                  { label: "Easy", value: "easy" },
                                  { label: "Medium", value: "medium" },
                                  { label: "Hard", value: "hard" },
                                ].map((d) => {
                                  const active = difficultyFilter === d.value;
                                  return (
                                    <button
                                      key={d.value}
                                      onClick={() => setDifficultyFilter(d.value)}
                                      className={`px-3 py-0.5 text-[10px] rounded-full border transition-all cursor-pointer font-medium select-none ${
                                        active
                                          ? d.value === "all"
                                            ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                                            : d.value === "easy"
                                            ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800"
                                            : d.value === "medium"
                                            ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
                                            : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
                                          : "bg-transparent hover:bg-secondary/20 text-muted-foreground border-border/80 dark:border-white/10"
                                      }`}
                                    >
                                      {d.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {filteredProblems.length === 0 ? (
                            <div className="p-12 rounded-2xl border border-dashed border-border/60 bg-[#fbfbfa] dark:bg-zinc-900/40 flex flex-col items-center justify-center text-center gap-3.5">
                              <div className="w-8 h-8 border border-border/80 dark:border-white/20 rounded flex items-center justify-center text-muted-foreground/40">
                                <span className="text-xs font-mono">⛶</span>
                              </div>
                              <div className="space-y-1 max-w-sm">
                                <p className="text-sm font-bold text-foreground">
                                  No problems shared yet
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Start your group CP ledger! Paste a LeetCode, Codeforces, or AtCoder problem link above.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3.5 mt-2">
                              {filteredProblems.map((problem, index) => (
                                <ProblemCard
                                  key={problem.id}
                                  problem={problem}
                                  index={index}
                                  onClick={() => setSelectedProblem(problem)}
                                  onDelete={
                                    activeGroupSummary?.isOwner || user?.username === problem.sharedBy
                                      ? () => {
                                          if (window.confirm(`Are you sure you want to remove '${problem.title}'?`)) {
                                            deleteProblemMutation.mutate(Number(problem.id));
                                          }
                                        }
                                      : undefined
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Boost Grind & Progress Gauges */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                      {/* Boost Your Grind Card */}
                      <div className="bg-[#fdf4f4] dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 shadow-sm flex items-center justify-between text-left">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center font-bold text-xs text-white shadow-sm shadow-red-500/20">
                            BI
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground font-sans tracking-tight">Boost Your Grind</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Launch squad arena battles</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate("/challenges")}
                          className="w-8 h-8 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center text-red-500 cursor-pointer transition-all animate-pulse"
                        >
                          <span className="text-xs font-mono">⛶</span>
                        </button>
                      </div>

                      {/* Weekly Progress Card */}
                      <div className="bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-6 shadow-sm text-left flex flex-col gap-6">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-widest border-b border-border/40 dark:border-white/5 pb-2">Weekly Progress</h3>
                        
                        <div className="grid grid-cols-3 gap-2 py-2 items-center justify-items-center">
                          {/* Gauge 1: Goal */}
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="26" stroke="hsl(var(--border) / 0.4)" strokeWidth="2.5" fill="none" />
                                <circle cx="32" cy="32" r="26" stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" strokeDasharray={circ} strokeDashoffset={goalOffset} strokeLinecap="round" />
                              </svg>
                              <span className="absolute text-[10px] font-bold font-mono text-foreground">{goalPercent}%</span>
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase tracking-wider text-center">Goal</span>
                          </div>

                          {/* Gauge 2: Easy */}
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="26" stroke="hsl(var(--border) / 0.4)" strokeWidth="2.5" fill="none" />
                                <circle cx="32" cy="32" r="26" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeDasharray={circ} strokeDashoffset={easyOffset} strokeLinecap="round" />
                              </svg>
                              <span className="absolute text-[10px] font-bold font-mono text-foreground">{easyPercent}%</span>
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase tracking-wider text-center">Easy</span>
                          </div>

                          {/* Gauge 3: Medium */}
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="26" stroke="hsl(var(--border) / 0.4)" strokeWidth="2.5" fill="none" />
                                <circle cx="32" cy="32" r="26" stroke="#eab308" strokeWidth="2.5" fill="none" strokeDasharray={circ} strokeDashoffset={mediumOffset} strokeLinecap="round" />
                              </svg>
                              <span className="absolute text-[10px] font-bold font-mono text-foreground">{mediumPercent}%</span>
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase tracking-wider text-center">Medium</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 2: Detailed Squad Roster & Invite Friends */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-left">
                  {/* Member List cards */}
                  <div className="md:col-span-7 bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">Active Roster ({membersList.length})</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Active problem solvers enrolled in the @{activeGroupSummary?.name} collaborative ledger.
                      </p>
                    </div>

                    <div className="space-y-3 mt-4">
                      {membersList.map((member) => {
                        const isSelf = member.username === user?.username;
                        return (
                          <div 
                            key={member.username} 
                            className="flex items-center justify-between p-3 rounded-xl bg-secondary/35 dark:bg-slate-900/30 border border-border/20 dark:border-white/5 text-xs font-mono"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-sans">
                                <span className="text-xs font-bold text-primary">
                                  {member.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-foreground block">@{member.username}</span>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider block mt-0.5">
                                  {isSelf ? "You" : "Member"}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            {activeGroupSummary?.isOwner && !isSelf ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to remove @${member.username} from the squad?`)) {
                                    removeMemberMutation.mutate(member.id);
                                  }
                                }}
                                disabled={removeMemberMutation.isPending}
                              >
                                Remove
                              </Button>
                            ) : isSelf ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to leave this squad?")) {
                                    removeMemberMutation.mutate(member.id);
                                  }
                                }}
                                disabled={removeMemberMutation.isPending}
                              >
                                Leave
                              </Button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Members section */}
                  <div className="md:col-span-5 bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">Invite Friends</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Add connected profile connections directly to this active squad workspace.
                      </p>
                    </div>

                    <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                      {friendsToInvite.length === 0 ? (
                        <div className="text-center text-[10px] text-muted-foreground py-10 bg-secondary/15 dark:bg-slate-900/10 rounded-xl font-mono">
                          No inviteable friends found.
                        </div>
                      ) : (
                        friendsToInvite.map((friend) => (
                          <div 
                            key={friend.id} 
                            className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 dark:bg-slate-900/10 border border-border/10 text-xs font-mono"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-foreground block truncate">@{friend.username}</span>
                              <span className="text-[9px] text-muted-foreground block truncate font-sans mt-0.5">{friend.displayName}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] font-bold border-primary/20 text-primary hover:bg-primary/10 rounded-lg cursor-pointer flex-shrink-0"
                              onClick={() => addMemberMutation.mutate(friend.id)}
                              disabled={addMemberMutation.isPending}
                            >
                              Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 rounded-2xl border border-dashed border-border/60 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center text-center gap-3">
              <FlaskConical className="w-10 h-10 text-muted-foreground/40 animate-pulse" />
              <div className="space-y-1.5 max-w-sm">
                <p className="text-sm font-bold text-foreground">No Squad Context Active</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To view shared ledgers, select an active squad from the sidebar navigation.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedProblem && <ProblemDetailsModal problem={selectedProblem} onClose={() => setSelectedProblem(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
