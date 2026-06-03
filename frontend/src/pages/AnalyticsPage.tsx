import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import {
  MonthlyVolumeChart,
  PlatformDifficultyBreakdown,
  PlatformLoyalty,
  StatCard,
  WeeklyActivity,
} from "@/components/AnalyticsCharts";
import { ProblemsListModal } from "@/components/ProblemsListModal";
import { api } from "@/lib/api";
import { MostPopularProblems, TopContributors } from "./Analytics/Leaderboards";

const AnalyticsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [timeFilter, setTimeFilter] = useState("30d");
  const [showProblems, setShowProblems] = useState(false);

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: api.listGroups,
  });

  const selectedGroupId = Number(searchParams.get("groupId") ?? 0);
  const selectedGroup = groupsQuery.data?.find((group) => group.id === selectedGroupId) ?? groupsQuery.data?.[0];

  useEffect(() => {
    if (!groupsQuery.data?.length) return;
    if (!selectedGroup || searchParams.get("groupId") !== String(selectedGroup.id)) {
      setSearchParams({ groupId: String(selectedGroup?.id ?? groupsQuery.data[0].id) }, { replace: true });
    }
  }, [groupsQuery.data, searchParams, selectedGroup, setSearchParams]);

  const analyticsQuery = useQuery({
    queryKey: ["group", selectedGroup?.id, "analytics", timeFilter],
    queryFn: () => api.getGroupAnalytics(selectedGroup!.id, timeFilter),
    enabled: Boolean(selectedGroup?.id),
  });

  const analytics = analyticsQuery.data;

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-10 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground leading-none mb-1">
            Squad Analytics
          </span>
          <h1 className="text-2xl font-bold tracking-tight">{selectedGroup ? selectedGroup.name : "Select a Squad"}</h1>
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg self-start md:self-auto">
          {["7d", "30d", "90d", "all"].map((filterValue) => (
            <button
              key={filterValue}
              onClick={() => setTimeFilter(filterValue)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeFilter === filterValue
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filterValue.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-6 py-6 space-y-8 pb-16">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Overview</h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(analytics?.stats ?? []).map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                change={stat.change ?? undefined}
                onClick={stat.label === "Total problems" ? () => setShowProblems(true) : undefined}
              />
            ))}
          </motion.div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Sharing Activity</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-card border shadow-sm h-[400px]"
            >
              <MonthlyVolumeChart data={analytics?.monthlyTrend ?? []} />
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Active Times</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-6 rounded-2xl bg-card border shadow-sm h-[400px]"
            >
              <WeeklyActivity data={analytics?.weeklyActivity ?? []} />
            </motion.div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Difficulty</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-card border shadow-sm flex-1"
            >
              <PlatformDifficultyBreakdown data={analytics?.platformDifficulty ?? []} />
            </motion.div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Platform Loyalty</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-2xl bg-card border shadow-sm flex-1"
            >
              <PlatformLoyalty data={analytics?.platformLoyalty ?? []} />
            </motion.div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopContributors data={analytics?.memberLeaderboard ?? []} />
          <MostPopularProblems data={analytics?.topProblems ?? []} />
        </section>
      </div>

      <AnimatePresence>
        {showProblems && selectedGroup && (
          <ProblemsListModal
            title={`${selectedGroup.name} — All Problems`}
            queryKey={["groupProblems", selectedGroup.id]}
            queryFn={() => api.listGroupProblems(selectedGroup.id)}
            onClose={() => setShowProblems(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalyticsPage;
