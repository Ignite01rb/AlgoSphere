import type { MemberLeaderboardEntry, TopProblemEntry } from "@/lib/types";

export const TopContributors = ({ data }: { data: MemberLeaderboardEntry[] }) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Top Contributors</h2>
        <div className="h-px flex-1 bg-border/40" />
      </div>

      <div className="rounded-2xl bg-card border shadow-sm p-6 space-y-4">
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No one has shared a problem yet.</div>
        ) : (
          data.map((member, index) => (
            <div key={member.name} className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-mono font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground block truncate">{member.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-foreground block">{member.problems}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Problems</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export const MostPopularProblems = ({ data }: { data: TopProblemEntry[] }) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Most Shared Problems</h2>
        <div className="h-px flex-1 bg-border/40" />
      </div>

      <div className="rounded-2xl bg-card border shadow-sm p-6 space-y-4">
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No problems shared yet.</div>
        ) : (
          data.map((problem, index) => (
            <div key={`${problem.title}-${problem.contest ?? index}`} className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-secondary text-foreground flex items-center justify-center font-mono font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground block truncate">{problem.title}</span>
                <span className="text-xs text-muted-foreground truncate block">
                  {problem.contest ?? "Shared across squads"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-foreground block">{problem.shares}x</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{problem.difficulty}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
