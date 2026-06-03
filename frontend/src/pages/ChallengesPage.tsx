import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ExternalLink,
  Loader2,
  Plus,
  Swords,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getDifficultyColor, hexToRgba } from "@/lib/difficulty-colors";
import { useAuth } from "@/lib/auth";
import type { Challenge, Friend } from "@/lib/types";

const CF_TAGS = [
  "dp", "greedy", "math", "implementation", "brute force", "binary search",
  "data structures", "graphs", "sortings", "constructive algorithms",
  "strings", "number theory", "geometry", "trees", "two pointers",
  "dfs and similar", "combinatorics", "bitmasks", "games", "hashing",
];

type View = "list" | "create" | { detail: number };

const ChallengesPage = () => {
  const [view, setView] = useState<View>("list");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const challengesQuery = useQuery({
    queryKey: ["challenges"],
    queryFn: api.listChallenges,
  });

  if (typeof view === "object" && "detail" in view) {
    return <ChallengeDetail id={view.detail} onBack={() => setView("list")} userId={user?.id} />;
  }

  if (view === "create") {
    return (
      <CreateChallenge
        onBack={() => setView("list")}
        onCreated={(c) => {
          void queryClient.invalidateQueries({ queryKey: ["challenges"] });
          setView({ detail: c.id });
        }}
      />
    );
  }

  const challenges = challengesQuery.data ?? [];
  const pending = challenges.filter((c) => c.status === "pending");
  const active = challenges.filter((c) => c.status === "active");
  const completed = challenges.filter((c) => c.status === "completed");

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-10 pb-16 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground leading-none mb-1 block">
              Challenges
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Battle Arena</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Codeforces only</p>
          </div>
          <Button onClick={() => setView("create")} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            New Challenge
          </Button>
        </div>

        {challenges.length === 0 && !challengesQuery.isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Swords className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">No challenges yet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Create a challenge and invite friends to solve Codeforces problems together.
            </p>
            <Button onClick={() => setView("create")} variant="outline" className="rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              Create your first challenge
            </Button>
          </motion.div>
        )}

        {pending.length > 0 && (
          <Section title="Pending" challenges={pending} onSelect={(id) => setView({ detail: id })} userId={user?.id} />
        )}
        {active.length > 0 && (
          <Section title="Active" challenges={active} onSelect={(id) => setView({ detail: id })} userId={user?.id} />
        )}
        {completed.length > 0 && (
          <Section title="Completed" challenges={completed} onSelect={(id) => setView({ detail: id })} userId={user?.id} />
        )}
      </div>
    </div>
  );
};

const Section = ({
  title,
  challenges,
  onSelect,
  userId,
}: {
  title: string;
  challenges: Challenge[];
  onSelect: (id: number) => void;
  userId?: number;
}) => (
  <section>
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">{title}</h2>
      <span className="text-xs text-muted-foreground/50">{challenges.length}</span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
    <div className="space-y-2">
      {challenges.map((c, i) => {
        const myStatus = c.participants.find((p) => p.userId === userId)?.status;
        const needsAction = myStatus === "invited";
        return (
          <motion.button
            key={c.id}
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors hover:bg-secondary/60 border ${needsAction ? "border-primary/30 bg-primary/5" : "border-transparent"}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Swords className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground block truncate">{c.title}</span>
              <span className="text-xs text-muted-foreground">
                by @{c.createdBy} · {c.numProblems} problems · {c.minRating}–{c.maxRating}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {needsAction && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Invited
                </span>
              )}
              <div className="flex -space-x-1.5">
                {c.participants.slice(0, 4).map((p) => (
                  <div
                    key={p.userId}
                    className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold ${
                      p.status === "accepted" ? "bg-green-500/20 text-green-600" :
                      p.status === "declined" ? "bg-red-500/20 text-red-600" :
                      "bg-secondary text-muted-foreground"
                    }`}
                    title={`@${p.username}: ${p.status}`}
                  >
                    {p.username[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  </section>
);

const CreateChallenge = ({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (c: Challenge) => void;
}) => {
  const [title, setTitle] = useState("");
  const [numProblems, setNumProblems] = useState(3);
  const [minRating, setMinRating] = useState(800);
  const [maxRating, setMaxRating] = useState(1600);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);

  const friendsQuery = useQuery({ queryKey: ["friends"], queryFn: api.listFriends });

  const createMutation = useMutation({
    mutationFn: api.createChallenge,
    onSuccess: (challenge) => {
      toast.success("Challenge created!");
      onCreated(challenge);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create challenge"),
  });

  const friends = friendsQuery.data ?? [];
  const canSubmit = title.trim().length >= 2 && selectedFriends.length > 0;

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-10 pb-16 space-y-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-1">New Challenge</span>
          <h1 className="text-2xl font-bold tracking-tight">Set Up Your Battle</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Problems sourced from Codeforces API</p>
        </div>

        <div className="space-y-5 p-6 rounded-2xl bg-card border shadow-sm">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DP Showdown"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Problems</label>
              <select
                value={numProblems}
                onChange={(e) => setNumProblems(Number(e.target.value))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Min Rating</label>
              <input
                type="number"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                min={0}
                max={3500}
                step={100}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Max Rating</label>
              <input
                type="number"
                value={maxRating}
                onChange={(e) => setMaxRating(Number(e.target.value))}
                min={0}
                max={3500}
                step={100}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Topics (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {CF_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
              Invite Friends
            </label>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add friends first to invite them.</p>
            ) : (
              <div className="space-y-1.5">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      setSelectedFriends((prev) =>
                        prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                      )
                    }
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      selectedFriends.includes(f.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-secondary/50 hover:bg-secondary border border-transparent"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden">
                      {f.avatarUrl ? (
                        <img src={f.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        f.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">{f.displayName}</span>
                      <span className="text-xs text-muted-foreground">@{f.username}</span>
                    </div>
                    {selectedFriends.includes(f.id) ? (
                      <UserCheck className="w-4 h-4 text-primary" />
                    ) : (
                      <UserPlus className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          className="w-full rounded-xl gap-2"
          size="lg"
          disabled={!canSubmit || createMutation.isPending}
          onClick={() =>
            createMutation.mutate({
              title: title.trim(),
              platform: "codeforces",
              numProblems,
              minRating,
              maxRating,
              tags: selectedTags,
              inviteUserIds: selectedFriends,
            })
          }
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
          Create Challenge
        </Button>
      </div>
    </div>
  );
};

const ChallengeDetail = ({
  id,
  onBack,
  userId,
}: {
  id: number;
  onBack: () => void;
  userId?: number;
}) => {
  const queryClient = useQueryClient();
  const challengeQuery = useQuery({
    queryKey: ["challenge", id],
    queryFn: () => api.getChallenge(id),
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptChallenge(id),
    onSuccess: () => {
      toast.success("Challenge accepted!");
      void queryClient.invalidateQueries({ queryKey: ["challenge", id] });
      void queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => api.declineChallenge(id),
    onSuccess: () => {
      toast.success("Challenge declined.");
      onBack();
      void queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => api.startChallenge(id),
    onSuccess: () => {
      toast.success("Challenge started!");
      void queryClient.invalidateQueries({ queryKey: ["challenge", id] });
      void queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });

  const c = challengeQuery.data;
  if (!c) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const myParticipant = c.participants.find((p) => p.userId === userId);
  const isCreator = c.createdById === userId;
  const allAccepted = c.participants.every((p) => p.status === "accepted");
  const hasDeclines = c.participants.some((p) => p.status === "declined");
  const showProblems = c.status === "active" || c.status === "completed";

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full px-6 pt-10 pb-16 space-y-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          All Challenges
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  c.status === "active" ? "bg-green-500/15 text-green-600" :
                  c.status === "pending" ? "bg-amber-500/15 text-amber-600" :
                  "bg-secondary text-muted-foreground"
                }`}
              >
                {c.status}
              </span>
              <span className="text-xs text-muted-foreground">Codeforces</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {c.numProblems} problems · Rating {c.minRating}–{c.maxRating}
              {c.tags && ` · ${c.tags}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {c.status === "pending" && (
          <div className="flex gap-2">
            {myParticipant?.status === "invited" && (
              <>
                <Button
                  className="rounded-xl gap-2"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                >
                  <Check className="w-4 h-4" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => declineMutation.mutate()}
                  disabled={declineMutation.isPending}
                >
                  <X className="w-4 h-4" />
                  Decline
                </Button>
              </>
            )}
            {isCreator && !hasDeclines && (
              <Button
                className="rounded-xl gap-2"
                variant={allAccepted ? "default" : "outline"}
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
              >
                <Swords className="w-4 h-4" />
                {allAccepted ? "Start Challenge" : "Force Start"}
              </Button>
            )}
          </div>
        )}

        {/* Participants */}
        <div className="p-5 rounded-2xl bg-card border shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-3">Participants</h3>
          <div className="space-y-2">
            {c.participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.username[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{p.displayName}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">@{p.username}</span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    p.status === "accepted" ? "bg-green-500/15 text-green-600" :
                    p.status === "declined" ? "bg-red-500/15 text-red-600" :
                    "bg-amber-500/15 text-amber-600"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Problems */}
        {showProblems && (
          <div className="p-5 rounded-2xl bg-card border shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-3">
              Problems
            </h3>
            <div className="space-y-2">
              {c.problems.map((prob, idx) => {
                const ratingColor = getDifficultyColor("codeforces", String(prob.rating ?? 0));
                return (
                  <a
                    key={prob.id}
                    href={prob.problemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/60 group"
                  >
                    <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-xs font-bold font-mono text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate group-hover:text-primary transition-colors">
                        {prob.title}
                      </span>
                      {prob.tags && (
                        <span className="text-[10px] text-muted-foreground/60 truncate block">{prob.tags}</span>
                      )}
                    </div>
                    {prob.rating && (
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: hexToRgba(ratingColor, 0.15),
                          color: ratingColor,
                        }}
                      >
                        {prob.rating}
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {c.status === "pending" && (
          <div className="p-5 rounded-2xl bg-secondary/30 border border-dashed text-center">
            <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Problems will be revealed once the challenge starts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengesPage;
