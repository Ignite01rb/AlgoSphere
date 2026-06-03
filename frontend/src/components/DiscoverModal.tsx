import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Check,
  Clock,
  Compass,
  Crown,
  FileText,
  Loader2,
  RefreshCw,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type DiscoverModalProps = {
  onClose: () => void;
};

export const DiscoverModal = ({ onClose }: DiscoverModalProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const topGroupsQuery = useQuery({
    queryKey: ["topGroups"],
    queryFn: api.getTopGroups,
    retry: 2,
    retryDelay: 1000,
  });

  const joinRequestsQuery = useQuery({
    queryKey: ["joinRequests", "incoming"],
    queryFn: api.listJoinRequests,
    retry: 2,
  });

  const requestJoinMutation = useMutation({
    mutationFn: (groupId: number) => api.requestJoinGroup(groupId),
    onSuccess: () => {
      toast.success("Join request sent!");
      void queryClient.invalidateQueries({ queryKey: ["topGroups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send request.");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: number) => api.acceptJoinRequest(requestId),
    onSuccess: () => {
      toast.success("Member added to squad!");
      void queryClient.invalidateQueries({ queryKey: ["joinRequests", "incoming"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to accept.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => api.rejectJoinRequest(requestId),
    onSuccess: () => {
      toast.success("Request rejected.");
      void queryClient.invalidateQueries({ queryKey: ["joinRequests", "incoming"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reject.");
    },
  });

  const joinRequests = joinRequestsQuery.data ?? [];
  const topGroups = topGroupsQuery.data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-start justify-center pt-[6vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-2xl bg-background rounded-2xl shadow-elevated overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight">Discover Squads</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          {/* Pending Join Requests */}
          <AnimatePresence>
            {joinRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b"
              >
                <div className="px-5 pt-4 pb-1.5">
                  <h4 className="text-base font-semibold flex items-center gap-2 text-primary">
                    <UserPlus className="w-4.5 h-4.5" />
                    Pending Requests
                    <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {joinRequests.length}
                    </span>
                  </h4>
                </div>
                <div className="px-4 pb-4 space-y-2">
                  {joinRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                          {req.avatarUrl ? (
                            <img src={req.avatarUrl} alt={req.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-secondary-foreground">{req.displayName[0]}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{req.displayName}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            wants to join <span className="font-medium text-foreground">{req.groupName}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 gap-1"
                          onClick={() => acceptMutation.mutate(req.id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => rejectMutation.mutate(req.id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Squads */}
          {topGroupsQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading squads...</p>
            </div>
          ) : topGroupsQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <AlertCircle className="w-10 h-10 opacity-40" />
              <p>Failed to load squads.</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void topGroupsQuery.refetch()}
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : topGroups.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No squads to discover yet. Create one and invite your friends!</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {topGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{group.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {group.problemCount} problems
                        </span>
                        <span className="flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          @{group.ownerUsername}
                        </span>
                        {group.lastActiveAt && (
                          <span className="hidden sm:flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(group.lastActiveAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {group.joinStatus === "member" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        <Check className="w-3 h-3" />
                        Joined
                      </span>
                    ) : group.joinStatus === "pending" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    ) : group.ownerUsername === user?.username ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        Owner
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => requestJoinMutation.mutate(group.id)}
                        disabled={requestJoinMutation.isPending}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Ask to Join
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
