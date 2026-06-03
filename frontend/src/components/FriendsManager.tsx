import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Bell, Search, X, AlertTriangle, BellOff, BellRing } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { toast } from "sonner";
import type { Friend } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { FriendsList } from "./FriendsManager/FriendsList";
import { FriendRequests } from "./FriendsManager/FriendRequests";
import { SearchUsers } from "./FriendsManager/SearchUsers";

type FriendsManagerProps = {
  onClose: () => void;
  initialTab?: "friends" | "requests" | "search";
};

export const FriendsManager = ({ onClose, initialTab = "friends" }: FriendsManagerProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery.trim(), 300);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const queryClient = useQueryClient();

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    typeof localStorage !== "undefined" && typeof localStorage.getItem === "function" ? localStorage.getItem("tuneTribe_notificationsEnabled") !== "false" : true
  );

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        const newState = !notificationsEnabled;
        setNotificationsEnabled(newState);
        if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
          localStorage.setItem("tuneTribe_notificationsEnabled", String(newState));
        }
        if (newState) {
          toast.success("Notifications enabled!");
        } else {
          toast.success("Notifications disabled.");
        }
        return;
      }

      if (Notification.permission === "denied") {
        toast.error("Notifications are blocked. Please click the site info (lock icon) in your browser address bar to allow them.", {
          duration: 5000,
        });
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setNotificationsEnabled(true);
        if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
          localStorage.setItem("tuneTribe_notificationsEnabled", "true");
        }
        toast.success("Notifications enabled!");
      } else if (permission === "denied") {
        toast.error("Notifications were denied. You can enable them later in your browser settings.");
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { data: friends = [] } = useQuery({
    queryKey: ["friendsList"],
    queryFn: api.listFriends,
  });

  const {
    data: searchResults = [],
    isFetching: isSearching,
    error: searchLookupError,
  } = useQuery({
    queryKey: ["friendSearch", debouncedQuery],
    queryFn: () => api.searchUsers(debouncedQuery),
    enabled: activeTab === "search" && debouncedQuery.length >= 2,
    retry: false,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: api.listFriendRequests,
    refetchInterval: 10000,
  });

  const addFriendMutation = useMutation({
    mutationFn: (friendId: number) => api.addFriend(friendId),
    onSuccess: (friend) => {
      if (friend.friendshipStatus === "accepted") {
        toast.success(`You and @${friend.username} are now friends!`);
      } else {
        toast.success(`Friend request sent to @${friend.username}`);
      }
      void queryClient.invalidateQueries({ queryKey: ["friendSearch"] });
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: number) => api.acceptFriendRequest(requestId),
    onSuccess: (friend) => {
      toast.success(`You and @${friend.username} are now friends!`);
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friendSearch"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => api.rejectFriendRequest(requestId),
    onSuccess: () => {
      toast.success("Friend request declined");
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friendSearch"] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId: number) => api.removeFriend(friendId),
    onSuccess: (_, friendId) => {
      const friend =
        friends.find((entry) => entry.id === friendId) ??
        searchResults.find((entry) => entry.id === friendId) ?? null;
      toast.success(friend ? `Successfully removed @${friend.username} from friends` : "Friend removed successfully");
      setFriendToRemove(null);
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friendSearch"] });
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: () => {
      toast.error("Failed to remove friend");
      setFriendToRemove(null);
    }
  });

  const tabs = [
    { id: "friends", label: "My Friends", icon: Users },
    { id: "requests", label: "Requests", icon: Bell, badge: requests.length },
    { id: "search", label: "Find Friends", icon: Search },
  ];

  const searchError =
    searchLookupError instanceof ApiError
      ? searchLookupError.message
      : searchLookupError instanceof Error
        ? searchLookupError.message
        : null;

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
        {friendToRemove ? (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold tracking-tight">Remove Friend?</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to remove <span className="font-semibold text-foreground">@{friendToRemove.username}</span> from your friends? They will also be removed from any groups you share.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFriendToRemove(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => removeFriendMutation.mutate(friendToRemove.id)}
                disabled={removeFriendMutation.isPending}
              >
                {removeFriendMutation.isPending ? "Removing..." : "Remove Friend"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
              <div className="flex gap-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as "friends" | "requests" | "search")}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors relative pb-3 -mb-3 ${
                      activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.badge ? (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {tab.badge}
                      </span>
                    ) : null}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {"Notification" in window && (
                  <button
                    onClick={requestNotificationPermission}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={notificationPermission === "granted" && notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}
                  >
                    {notificationPermission === "granted" && notificationsEnabled ? (
                      <BellRing className="w-5 h-5 text-primary" />
                    ) : (
                      <BellOff className="w-5 h-5" />
                    )}
                  </button>
                )}
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === "friends" && (
                    <FriendsList
                      friends={friends}
                      onRemove={setFriendToRemove}
                      onSearch={() => setActiveTab("search")}
                    />
                  )}

                  {activeTab === "requests" && (
                    <FriendRequests
                      requests={requests}
                      onAccept={(id) => acceptMutation.mutate(id)}
                      isAccepting={acceptMutation.isPending}
                      onReject={(id) => rejectMutation.mutate(id)}
                      isRejecting={rejectMutation.isPending}
                    />
                  )}

                  {activeTab === "search" && (
                    <SearchUsers
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      searchResults={searchResults}
                      isSearching={isSearching}
                      searchError={searchError}
                      hasQuery={debouncedQuery.length >= 2}
                      requests={requests}
                      onAddFriend={(id) => addFriendMutation.mutate(id)}
                      onAccept={(id) => acceptMutation.mutate(id)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};
