import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Edit3 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PlatformDifficultyBreakdown, PlatformLoyalty, StatCard } from "@/components/AnalyticsCharts";
import { AvatarPickerModal } from "@/components/AvatarPickerModal";
import { ProfileInfo } from "@/components/ProfileInfo";
import { ProblemsListModal } from "@/components/ProblemsListModal";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ProfilePage = () => {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    favoriteTopic: "",
    favoritePlatform: "",
    avatarUrl: "",
    username: "",
    leetcodeHandle: "",
    codeforcesHandle: "",
    codechefHandle: "",
    atcoderHandle: "",
  });

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics", "me", "all"],
    queryFn: () => api.getPersonalAnalytics("all"),
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setProfileData({
      displayName: profileQuery.data.displayName,
      bio: profileQuery.data.bio,
      favoriteTopic: profileQuery.data.favoriteTopic ?? "",
      favoritePlatform: profileQuery.data.favoritePlatform ?? "",
      avatarUrl: profileQuery.data.avatarUrl ?? "",
      username: profileQuery.data.username,
      leetcodeHandle: profileQuery.data.leetcodeHandle ?? "",
      codeforcesHandle: profileQuery.data.codeforcesHandle ?? "",
      codechefHandle: profileQuery.data.codechefHandle ?? "",
      atcoderHandle: profileQuery.data.atcoderHandle ?? "",
    });
  }, [profileQuery.data]);

  const handleDataChange = (field: keyof typeof profileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfileMutation = useMutation({
    mutationFn: () =>
      api.updateProfile({
        displayName: profileData.displayName,
        bio: profileData.bio,
        favoriteTopic: profileData.favoriteTopic || null,
        favoritePlatform: profileData.favoritePlatform || null,
        avatarUrl: profileData.avatarUrl || null,
        leetcodeHandle: profileData.leetcodeHandle || null,
        codeforcesHandle: profileData.codeforcesHandle || null,
        codechefHandle: profileData.codechefHandle || null,
        atcoderHandle: profileData.atcoderHandle || null,
      }),
    onSuccess: (user) => {
      updateUser(user);
      queryClient.setQueryData(["profile"], user);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Profile update failed.");
    },
  });

  const handleAvatarSelect = (url: string) => {
    handleDataChange("avatarUrl", url);
    setShowAvatarPicker(false);
    if (!isEditing) {
      api.updateProfile({
        displayName: profileQuery.data?.displayName || "",
        bio: profileQuery.data?.bio || "",
        avatarUrl: url,
      })
        .then((user) => {
          updateUser(user);
          queryClient.setQueryData(["profile"], user);
          toast.success("Profile picture updated");
        })
        .catch(() => toast.error("Failed to update profile picture"));
    }
  };

  const stats = analyticsQuery.data?.stats ?? [];

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full max-w-4xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
        {!isEditing ? (
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-full gap-2" onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4" /> Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-full" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 px-4 rounded-full gap-2 shadow-sm"
              onClick={() => saveProfileMutation.mutate()}
              disabled={saveProfileMutation.isPending}
            >
              <Check className="w-4 h-4" /> {saveProfileMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl mx-auto px-6 pb-10 space-y-10">
        <ProfileInfo
          data={profileData}
          isEditing={isEditing}
          onDataChange={handleDataChange}
          onAvatarClick={() => setShowAvatarPicker(true)}
        />

        {stats.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">All Time Stats</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {stats.map((stat) => (
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
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Difficulty</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-card border shadow-sm flex-1"
            >
              <PlatformDifficultyBreakdown data={analyticsQuery.data?.platformDifficulty ?? []} />
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
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl bg-card border shadow-sm flex-1"
            >
              <PlatformLoyalty data={analyticsQuery.data?.platformLoyalty ?? []} />
            </motion.div>
          </div>
        </section>
      </div>

      <AvatarPickerModal isOpen={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} onSelect={handleAvatarSelect} />
      <AnimatePresence>
        {showProblems && (
          <ProblemsListModal
            title="All Problems"
            queryKey={["problemsFeed"]}
            queryFn={api.getProblemsFeed}
            onClose={() => setShowProblems(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
