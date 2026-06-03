import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Users, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendsSearch } from "./FriendsSearch";
import type { Friend } from "@/lib/types";
import type { Group } from "@/components/GroupCard";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

type ManageGroupMembersModalProps = {
  group: Group;
  onClose: () => void;
};

export const ManageGroupMembersModal = ({ group, onClose }: ManageGroupMembersModalProps) => {
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showFriendSearch) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showFriendSearch]);

  const addMemberMutation = useMutation({
    mutationFn: (memberId: number) => api.addGroupMembers(Number(group.id), [memberId]),
    onSuccess: () => {
      toast.success("Member added successfully");
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: () => {
      toast.error("Failed to add member");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => api.removeGroupMember(Number(group.id), userId),
    onSuccess: (_, userId) => {
      if (userId === user?.id) {
        toast.success("You left the squad");
        onClose();
      } else {
        toast.success("Member removed successfully");
      }
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to remove member");
    },
  });

  const handleAddMember = (friend: Friend) => {
    if (group.members.includes(friend.username)) {
      toast.error(`@${friend.username} is already a member`);
      return;
    }
    addMemberMutation.mutate(friend.id);
  };

  const isCurrentUser = (memberUsername: string) => user?.username === memberUsername;
  const canRemove = (memberUsername: string) => {
    // Owner can remove anyone (except themselves, which is handled backend, but we can hide it).
    if (group.isOwner && !isCurrentUser(memberUsername)) return true;
    // Anyone can remove themselves.
    if (isCurrentUser(memberUsername)) return true;
    return false;
  };

  const membersList = group.memberDetails || group.members.map(m => ({ id: 0, username: m }));

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card w-full max-w-md rounded-xl shadow-lg border overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Manage Squad
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-muted-foreground">Members ({membersList.length})</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 px-3 bg-secondary/50 hover:bg-secondary"
                  onClick={() => setShowFriendSearch(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> Add friends
                </Button>
              </div>

              {membersList.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center bg-secondary/50 rounded-lg">
                  No members yet. Add friends to this squad.
                </div>
              ) : (
                <div className="space-y-2">
                  {membersList.map((member) => (
                    <div
                      key={member.username}
                      className="flex items-center justify-between bg-secondary/30 px-3 py-2 rounded-lg"
                    >
                      <span className="text-sm font-medium">@{member.username}</span>
                      {canRemove(member.username) && member.id !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (window.confirm(isCurrentUser(member.username) ? "Are you sure you want to leave this squad?" : `Are you sure you want to remove @${member.username}?`)) {
                              removeMemberMutation.mutate(member.id);
                            }
                          }}
                          disabled={removeMemberMutation.isPending}
                        >
                          {isCurrentUser(member.username) ? "Leave" : <><UserMinus className="w-3.5 h-3.5 mr-1" /> Remove</>}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showFriendSearch && (
          <FriendsSearch
            mode="add-to-group"
            onClose={() => setShowFriendSearch(false)}
            onSelect={(friend) => {
              handleAddMember(friend);
              setShowFriendSearch(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
