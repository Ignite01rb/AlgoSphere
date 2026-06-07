import { useState, useMemo, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, BookOpen, Building2, Code2, Eye, FlaskConical, LogOut, Moon, Plus, Sun, Swords, UserCircle, Users, Compass, Search, Trash2 } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CreateGroupModal } from "@/components/CreateGroupModal";
import { DiscoverModal } from "@/components/DiscoverModal";
import { FriendsManager } from "@/components/FriendsManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProblemNotifications } from "@/hooks/use-problem-notifications";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";
import type { Group } from "@/components/GroupCard";
import { formatRelativeTime } from "@/lib/format";

export const AlgoArenaLogo = ({ className = "w-6 h-6", color = "url(#navLogoGrad)" }: { className?: string; color?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="navLogoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(var(--primary))" />
        <stop offset="0.5" stopColor="hsl(var(--primary) / 0.85)" />
        <stop offset="1" stopColor="hsl(var(--primary) / 0.4)" />
      </linearGradient>
      <filter id="navLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" opacity="0.85" operator="over" />
      </filter>
    </defs>
    
    {/* Triangular Team Network Graph (Crest) */}
    <path d="M8 7 L12 4 L16 7 Z" stroke={color} strokeWidth="1.0" strokeLinejoin="round" opacity="0.4" />
    <circle cx="12" cy="4" r="1.5" fill={color} filter={color.startsWith("url") ? "url(#navLogoGlow)" : undefined} />
    <circle cx="8" cy="7" r="1.5" fill={color} />
    <circle cx="16" cy="7" r="1.5" fill={color} />
    
    {/* Crossed Swords (Clashing slashes) */}
    <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="14.5" x2="9.5" y2="16" stroke={color} strokeWidth="1.2" />
    
    <line x1="15.5" y1="15.5" x2="8.5" y2="8.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="16" y1="14.5" x2="14.5" y2="16" stroke={color} strokeWidth="1.2" />

    {/* Interlocking Code Brackets (Shield sides) */}
    <path d="M7.2 8 C6.2 8, 5.5 8.8, 5.5 9.8 L5.5 11.2 C5.5 11.8, 4.8 12.1, 4.3 12.5 C4.8 12.9, 5.5 13.2, 5.5 13.8 L5.5 15.2 C5.5 16.2, 6.2 17, 7.2 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    <path d="M16.8 8 C17.8 8, 18.5 8.8, 18.5 9.8 L18.5 11.2 C18.5 11.8, 19.2 12.1, 19.7 12.5 C19.2 12.9, 18.5 13.2, 18.5 13.8 L18.5 15.2 C18.5 16.2, 17.8 17, 16.8 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    
    {/* Bottom Code Lines / Battle Ground */}
    <line x1="10" y1="19" x2="14" y2="19" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <line x1="9" y1="21" x2="15" y2="21" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
    <line x1="11" y1="23" x2="13" y2="23" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
  </svg>
);

export const MainLayout = () => {
  useProblemNotifications();

  const [friendsManagerTab, setFriendsManagerTab] = useState<"friends" | "requests" | "search" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const { isDark, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { activeGroup, setActiveGroup, showCreateGroup, setShowCreateGroup, showDiscover, setShowDiscover, activeTab, setActiveTab } = useAppContext();

  const friendRequestsQuery = useQuery({
    queryKey: ["friendRequests"],
    queryFn: api.listFriendRequests,
    refetchInterval: 10000,
  });

  const joinRequestsQuery = useQuery({
    queryKey: ["joinRequests", "incoming"],
    queryFn: api.listJoinRequests,
    refetchInterval: 15000,
  });

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: api.listGroups,
  });

  const pendingRequestCount = friendRequestsQuery.data?.length ?? 0;

  const createGroupMutation = useMutation({
    mutationFn: ({ name, memberIds }: { name: string; memberIds: number[] }) =>
      api.createGroup({ name, memberIds }),
    onSuccess: (group) => {
      toast.success(`Squad "${group.name}" created`);
      setActiveGroup(group.id);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      navigate("/dashboard");
      setShowCreateGroup(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Squad creation failed.");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number | string) => api.deleteGroup(Number(groupId)),
    onSuccess: (_, deletedGroupId) => {
      toast.success("Squad deleted successfully");
      setGroupToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (activeGroup === Number(deletedGroupId)) {
        setActiveGroup(null);
        localStorage.removeItem("algosphere-active-group");
      }
    },
    onError: () => {
      toast.error("Failed to delete squad");
      setGroupToDelete(null);
    },
  });

  const filteredGroups: Group[] = useMemo(
    () =>
      (groupsQuery.data ?? [])
        .filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((group) => ({
          id: group.id,
          name: group.name,
          memberCount: group.memberCount,
          problemCount: group.problemCount,
          lastActive: formatRelativeTime(group.lastActiveAt),
          members: group.members,
          memberDetails: group.memberDetails,
          isOwner: group.isOwner,
        })),
    [groupsQuery.data, searchQuery]
  );

  const activeGroupSummary = useMemo(
    () => groupsQuery.data?.find((group) => group.id === activeGroup) ?? null,
    [groupsQuery.data, activeGroup]
  );

  const menuItems = [
    { icon: Code2, label: "Workspace Feed", path: "/dashboard" },
    { icon: Eye, label: "Algorithm Canvas", path: "/visualize" },
    { icon: Swords, label: "Battle Arena", path: "/challenges" },
    { icon: Building2, label: "Target Cohorts", path: "/companies" },
    { icon: FlaskConical, label: "Case Sandbox", path: "/test-generator" },
    { icon: BookOpen, label: "Scale Blueprints", path: "/system-design" },
    {
      icon: BarChart3,
      label: "Output Insights",
      path: activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics",
      matchPath: "/analytics",
    },
  ];

  const currentTitle = useMemo(() => {
    const matched = menuItems.find((item) =>
      item.matchPath
        ? location.pathname.startsWith(item.matchPath)
        : location.pathname === item.path
    );
    return matched ? matched.label : "Console Workspace";
  }, [location.pathname]);

  const navItems = [
    { icon: Code2, label: "Feed", path: "/dashboard" },
    { icon: Swords, label: "Battle", path: "/challenges" },
    { icon: Plus, label: "Add", action: () => setShowCreateGroup(true) },
    {
      icon: BarChart3,
      label: "Analytics",
      path: activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics",
      matchPath: "/analytics",
    },
    {
      label: "Profile",
      path: "/profile",
      icon: user?.avatarUrl
        ? () => (
            <div className="w-5 h-5 rounded-full overflow-hidden border border-primary/20 bg-secondary flex items-center justify-center">
              <img src={user.avatarUrl!} alt={user.displayName} className="w-full h-full object-cover" />
            </div>
          )
        : UserCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-[#121110] flex flex-row md:p-4 md:gap-4">
      {/* Floating capsule left navigation sidebar for Desktop viewports */}
      <aside className="hidden md:flex flex-col w-16 bg-white dark:bg-zinc-900 border border-border/80 dark:border-white/5 rounded-[24px] h-[calc(100vh-2rem)] sticky top-4 shadow-sm items-center py-6 gap-6 flex-shrink-0">
        {/* Brand logo (Red Brackets capsule) */}
        <div 
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center cursor-pointer shadow-sm shadow-red-500/25 transition-all hover:scale-105"
          title="AlgoArena"
        >
          <AlgoArenaLogo className="w-6.5 h-6.5 text-white" color="white" />
        </div>

        {/* Dynamic menu page links */}
        <div className="flex flex-col gap-3.5 flex-1 w-full items-center">
          {menuItems.map((item) => {
            const isActive = item.matchPath
              ? location.pathname.startsWith(item.matchPath)
              : location.pathname === item.path;
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer relative ${
                      isActive
                        ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-[#d9383a]"
                        : "border-border/60 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5" />
                    {isActive && (
                      <span className="absolute w-1.5 h-1.5 bg-[#d9383a] rounded-full bottom-1" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Bottom capsule actions (Theme, Logout, Avatar) */}
        <div className="flex flex-col gap-3.5 items-center mt-auto pb-2">
          {/* App Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl border border-border/60 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 cursor-pointer transition-all"
              >
                {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">App Theme</TooltipContent>
          </Tooltip>

          {/* Log out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="w-10 h-10 rounded-xl border border-border/60 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-all"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>

          <div className="h-px w-8 bg-border/40 my-1" />

          {/* User Profile Avatar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="relative cursor-pointer hover:scale-105 transition-all"
                onClick={() => navigate("/profile")}
              >
                {user?.avatarUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-red-500 bg-secondary flex items-center justify-center shadow-sm">
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-red-500 bg-red-500 flex items-center justify-center text-white font-bold text-xs">
                    {(user?.displayName || user?.username || "BI").substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 border border-background rounded-full animate-pulse" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="text-left font-sans">
                <p className="text-xs font-bold text-foreground">@{user?.username || "username"}</p>
                <p className="text-[10px] text-muted-foreground">{user?.displayName}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main dashboard content container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen md:h-[calc(100vh-2rem)] md:gap-4 overflow-hidden">
        {/* Context top-bar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-border/40 md:border md:border-border/80 dark:border-white/5 md:rounded-2xl h-14 px-6 flex items-center justify-between flex-shrink-0 md:shadow-sm">
          {/* Left: WORKSPACE / @squad */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">WORKSPACE</span>
            <span className="text-muted-foreground/30">/</span>
            {activeGroupSummary ? (
              <span className="text-xs font-semibold text-foreground lowercase bg-secondary/50 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-border/40 dark:border-white/5">
                @{activeGroupSummary.name}
              </span>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground lowercase">
                @no-squad
              </span>
            )}
          </div>

          {/* Center: Tabs switcher (Dashboard Hub / Squad Roster) */}
          {location.pathname === "/dashboard" && activeGroupSummary ? (
            <div className="flex items-center gap-2 select-none">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all rounded-lg cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-red-50 dark:bg-red-950/20 text-[#d9383a] border border-[#d9383a]/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                }`}
              >
                Dashboard Hub
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all rounded-lg cursor-pointer ${
                  activeTab === "members"
                    ? "bg-red-50 dark:bg-red-950/20 text-[#d9383a] border border-[#d9383a]/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                }`}
              >
                Squad Roster
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              {currentTitle}
            </div>
          )}

          {/* Right: Three square control buttons */}
          <div className="flex items-center gap-2">
            {/* Button 1: Discover Squads button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowDiscover(true)}
                  className="w-9 h-9 border border-border/80 dark:border-white/5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 cursor-pointer transition-all relative"
                >
                  <Compass className="w-4 h-4" />
                  {joinRequestsQuery.data && joinRequestsQuery.data.length > 0 && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Discover Squads</TooltipContent>
            </Tooltip>

            {/* Button 2: Friends Manager Console button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setFriendsManagerTab(pendingRequestCount > 0 ? "requests" : "friends")}
                  className={`w-9 h-9 border border-border/80 dark:border-white/5 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                    friendsManagerTab ? "bg-secondary dark:bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Users className="w-4.5 h-4.5" />
                  {pendingRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {pendingRequestCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Friends Console</TooltipContent>
            </Tooltip>

            {/* Button 3: Theme Toggle Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 border border-border/80 dark:border-white/5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 cursor-pointer transition-all"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>Toggle Theme</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 w-full pb-14 md:pb-0 overflow-y-auto">
          <Suspense fallback={
            <div className="h-full w-full flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-2">
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider animate-pulse">Syncing console...</span>
              </div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 border-t">
        <div className="flex items-center justify-around h-14">
          {navItems.map((tab) => {
            const isActive = tab.path
              ? location.pathname === tab.path || (tab.matchPath && location.pathname.startsWith(tab.matchPath))
              : false;
            return (
              <button
                key={tab.label}
                onClick={() => {
                  if (tab.action) tab.action();
                  else if (tab.path) navigate(tab.path);
                }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                } cursor-pointer`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals & Portals */}
      <AnimatePresence>
        {friendsManagerTab && (
          <FriendsManager initialTab={friendsManagerTab} onClose={() => setFriendsManagerTab(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreate={(name, memberIds) =>
              createGroupMutation.mutateAsync({ name, memberIds }).then(() => undefined)
            }
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDiscover && <DiscoverModal onClose={() => setShowDiscover(false)} />}
      </AnimatePresence>

      {/* Delete Group Confirmation Modal */}
      <AnimatePresence>
        {groupToDelete && (
          <div
            className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setGroupToDelete(null)}
          >
            <div
              className="w-full max-w-sm bg-background rounded-xl p-6 border border-border shadow-elevated"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-2">Delete Squad</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-foreground">@{groupToDelete.name}</span>? This action is permanent.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="cursor-pointer" onClick={() => setGroupToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => deleteGroupMutation.mutate(groupToDelete.id)}
                  disabled={deleteGroupMutation.isPending}
                >
                  {deleteGroupMutation.isPending ? "Deleting..." : "Delete Squad"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
