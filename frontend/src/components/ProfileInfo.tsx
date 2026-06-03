import { Camera, Code2, Layers3, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";

export type ProfileData = {
  displayName: string;
  username?: string;
  bio: string;
  favoriteTopic: string;
  favoritePlatform: string;
  avatarUrl: string;
  leetcodeHandle: string;
  codeforcesHandle: string;
  codechefHandle: string;
  atcoderHandle: string;
};

type ProfileInfoProps = {
  data: ProfileData;
  isEditing: boolean;
  onDataChange: (field: keyof ProfileData, value: string) => void;
  onAvatarClick: () => void;
};

export const ProfileInfo = ({ data, isEditing, onDataChange, onAvatarClick }: ProfileInfoProps) => {
  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row items-center md:items-start gap-8"
      >
        <div className="relative group">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary flex items-center justify-center overflow-hidden shadow-elevated border-4 border-background ring-1 ring-border/50">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-16 h-16 text-muted-foreground opacity-50" />
            )}
          </div>
          <button
            onClick={onAvatarClick}
            className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg text-primary-foreground hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Change profile picture"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          {isEditing ? (
            <div className="space-y-4 max-w-md mx-auto md:mx-0">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Display Name</label>
                <Input
                  value={data.displayName}
                  onChange={(event) => onDataChange("displayName", event.target.value)}
                  className="h-12 text-lg font-semibold bg-card"
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bio</label>
                <Input
                  value={data.bio}
                  onChange={(event) => onDataChange("bio", event.target.value)}
                  className="h-10 text-base bg-card"
                  placeholder="Tell us what you are grinding..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Topic</label>
                  <Input
                    value={data.favoriteTopic}
                    onChange={(event) => onDataChange("favoriteTopic", event.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="e.g. Graphs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Platform</label>
                  <Input
                    value={data.favoritePlatform}
                    onChange={(event) => onDataChange("favoritePlatform", event.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="e.g. LeetCode"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">LeetCode Handle</label>
                  <Input
                    value={data.leetcodeHandle}
                    onChange={(event) => onDataChange("leetcodeHandle", event.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="LeetCode Username"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Codeforces Handle</label>
                  <Input
                    value={data.codeforcesHandle}
                    onChange={(event) => onDataChange("codeforcesHandle", event.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="Codeforces Username"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CodeChef Handle</label>
                  <Input
                    value={data.codechefHandle}
                    onChange={(event) => onDataChange("codechefHandle", event.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="CodeChef Username"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AtCoder Handle</label>
                  <Input
                    value={data.atcoderHandle}
                    onChange={(event) => onDataChange("atcoderHandle", event.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="AtCoder Username"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{data.displayName}</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                  <span className="text-base font-mono font-medium text-primary">@{data.username}</span>
                </div>
              </div>

              <p className="text-lg text-muted-foreground max-w-xl mx-auto md:mx-0 leading-relaxed">
                {data.bio || "No bio yet. The profile is all signal, no filler."}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                {data.favoriteTopic && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground text-sm font-medium">
                    <Layers3 className="w-4 h-4 text-primary" />
                    {data.favoriteTopic}
                  </div>
                )}
                {data.favoritePlatform && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground text-sm font-medium">
                    <Code2 className="w-4 h-4 text-primary" />
                    {data.favoritePlatform}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                {data.leetcodeHandle && (
                  <a href={`https://leetcode.com/${data.leetcodeHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold transition-all">
                    LeetCode: @{data.leetcodeHandle}
                  </a>
                )}
                {data.codeforcesHandle && (
                  <a href={`https://codeforces.com/profile/${data.codeforcesHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-xs font-semibold transition-all">
                    Codeforces: @{data.codeforcesHandle}
                  </a>
                )}
                {data.codechefHandle && (
                  <a href={`https://www.codechef.com/users/${data.codechefHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 text-xs font-semibold transition-all">
                    CodeChef: @{data.codechefHandle}
                  </a>
                )}
                {data.atcoderHandle && (
                  <a href={`https://atcoder.jp/users/${data.atcoderHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 text-xs font-semibold transition-all">
                    AtCoder: @{data.atcoderHandle}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
};
