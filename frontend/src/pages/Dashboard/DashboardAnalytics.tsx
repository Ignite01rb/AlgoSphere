import { PlatformDifficultyBreakdown, PlatformLoyalty, StatCard, WeeklyActivity } from "@/components/AnalyticsCharts";
import type { Analytics } from "@/lib/types";

type DashboardAnalyticsProps = {
  weeklyTotal: number;
  memberCount: number;
  topDifficulty: string;
  topPlatform: string;
  chartData: Analytics | undefined;
};

export const DashboardAnalytics = ({
  weeklyTotal,
  memberCount,
  topDifficulty,
  topPlatform,
  chartData,
}: DashboardAnalyticsProps) => {
  return (
    <aside className="hidden lg:block w-80 xl:w-96 h-full overflow-y-auto border-l border-border/40 bg-card/10 backdrop-blur-sm">
      <div className="p-6 space-y-7">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Quick Stats</h2>
            <div className="h-px flex-1 bg-border/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="This week" value={String(weeklyTotal)} />
            <StatCard label="Members" value={String(memberCount)} />
            <StatCard label="Top difficulty" value={topDifficulty} />
            <StatCard label="Top platform" value={topPlatform} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Active Times</h2>
            <div className="h-px flex-1 bg-border/20" />
          </div>
          <div className="p-5 rounded-xl bg-card/45 border border-border/30 hover:border-border/60 transition-all shadow-sm">
            <WeeklyActivity data={chartData?.weeklyActivity ?? []} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Difficulty</h2>
            <div className="h-px flex-1 bg-border/20" />
          </div>
          <div className="p-5 rounded-xl bg-card/45 border border-border/30 hover:border-border/60 transition-all shadow-sm">
            <PlatformDifficultyBreakdown data={chartData?.platformDifficulty ?? []} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Platform Loyalty</h2>
            <div className="h-px flex-1 bg-border/20" />
          </div>
          <div className="p-5 rounded-xl bg-card/45 border border-border/30 hover:border-border/60 transition-all shadow-sm">
            <PlatformLoyalty data={chartData?.platformLoyalty ?? []} />
          </div>
        </div>
      </div>
    </aside>
  );
};
