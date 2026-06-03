import { motion } from "framer-motion";
import { Bell, Check, X, UserPlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";

type FriendRequestsPanelProps = {
  onClose: () => void;
};

export const FriendRequestsPanel = ({ onClose }: FriendRequestsPanelProps) => {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: api.listFriendRequests,
    refetchInterval: 10000,
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: number) => api.acceptFriendRequest(requestId),
    onSuccess: (friend) => {
      toast.success(`You and @${friend.username} are now friends!`);
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["friendLookup"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => api.rejectFriendRequest(requestId),
    onSuccess: () => {
      toast.success("Friend request declined");
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["friendLookup"] });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-md bg-background rounded-2xl shadow-elevated overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold tracking-tight">Friend Requests</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {requests.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <UserPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-base text-muted-foreground">No pending friend requests</p>
              <p className="text-sm text-muted-foreground/70 mt-1">When someone sends you a request, it will appear here.</p>
            </div>
          ) : (
            <div className="py-1">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {req.fromUser.displayName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-base font-medium text-foreground">{req.fromUser.displayName}</span>
                      <span className="block text-sm text-muted-foreground">
                        @{req.fromUser.username} · {formatRelativeTime(req.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-sm gap-1"
                      onClick={() => acceptMutation.mutate(req.id)}
                      disabled={acceptMutation.isPending}
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
