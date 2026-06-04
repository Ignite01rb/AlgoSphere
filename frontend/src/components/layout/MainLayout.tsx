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

export const AlgoArenaLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="navLogoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(var(--primary))" />
        <stop offset="0.5" stopColor="hsl(var(--primary) / 0.85)" />
        <stop offset="1" stopColor="hsl(var(--primary) / 0.4)" />
      </linearGradient>
      <filter id="navLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="url(#navLogoGrad)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.3" />
    <path d="M12 2C16 5.5 16 18.5 12 22" stroke="url(#navLogoGrad)" strokeWidth="1" opacity="0.4" />
    <path d="M12 2C8 5.5 8 18.5 12 22" stroke="url(#navLogoGrad)" strokeWidth="1" opacity="0.4" />
    <line x1="2" y1="12" x2="22" y2="12" stroke="url(#navLogoGrad)" strokeWidth="1" opacity="0.4" />
    <path d="M12 7 L17 12 L12 17 L7 12 Z" stroke="url(#navLogoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 2 L12 22" stroke="url(#navLogoGrad)" strokeWidth="1" />
    <circle cx="12" cy="12" r="2.5" fill="url(#navLogoGrad)" filter="url(#navLogoGlow)" />
    <circle cx="12" cy="7" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="17" cy="12" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="12" cy="17" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="7" cy="12" r="1.2" fill="currentColor" className="text-foreground" />
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
  const { activeGroup, setActiveGroup, showCreateGroup, setShowCreateGroup, showDiscover, setShowDiscover } = useAppContext();

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
    <div className="min-h-screen bg-background flex flex-row">
      {/* Sleek left navigation drawer for Desktop viewports */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/40 bg-sidebar/20 backdrop-blur-md h-screen sticky top-0 flex-shrink-0">
        {/* Brand header */}
        <div className="h-14 px-6 flex items-center gap-3 border-b border-border/40 cursor-pointer flex-shrink-0" onClick={() => navigate("/dashboard")}>
          <AlgoArenaLogo className="w-6.5 h-6.5" />
          <span className="text-sm font-bold tracking-[0.12em] uppercase font-mono text-foreground">
            AlgoArena
          </span>
        </div>

        {/* Centered Profile Section (Mockup alignment) */}
        <div className="py-6 flex flex-col items-center border-b border-border/30 bg-secondary/5">
          <div className="relative group cursor-pointer" onClick={() => navigate("/profile")}>
            {user?.avatarUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-secondary flex items-center justify-center shadow-md">
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 bg-secondary flex items-center justify-center shadow-md">
                <UserCircle className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full animate-pulse" />
          </div>
          <h2 className="text-xs font-bold text-foreground mt-3 font-sans truncate max-w-[180px] cursor-pointer hover:text-primary transition-colors" onClick={() => navigate("/profile")}>
            {user?.displayName || "Grinder Pro"}
          </h2>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            @{user?.username || "squad"}
          </p>
        </div>

        {/* Dynamic workspace pages */}
        <div className="px-3 pt-4 space-y-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 px-3.5 block mb-1">
            Menu Navigation
          </span>
          {menuItems.map((item) => {
            const isActive = item.matchPath
              ? location.pathname.startsWith(item.matchPath)
              : location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                } cursor-pointer`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground/80"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic squad selections selector */}
        <div className="flex-1 overflow-y-auto px-3 mt-5 space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between border-t border-border/40 pt-4 px-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 font-bold">
              Your Squads ({filteredGroups.length})
            </span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setShowCreateGroup(true)}
                className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-all cursor-pointer"
                title="Create Squad"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowDiscover(true)}
                className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-all cursor-pointer relative"
                title="Discover Squads"
              >
                <Compass className="w-3.5 h-3.5" />
                {joinRequestsQuery.data && joinRequestsQuery.data.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <div className="relative px-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search squads..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-8.5 h-8 text-[11px] border border-border/40 bg-secondary/30 focus-visible:ring-1 focus-visible:ring-primary/45 rounded-lg shadow-none"
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[220px] scrollbar-thin flex-1 px-1">
            {filteredGroups.length === 0 ? (
              <div className="text-[10px] text-muted-foreground px-2 py-3 bg-secondary/20 rounded-lg text-center font-mono">
                No squads loaded
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isActive = activeGroup === group.id;
                return (
                  <div 
                    key={group.id}
                    onClick={() => {
                      setActiveGroup(Number(group.id));
                      if (location.pathname !== "/dashboard") {
                        navigate("/dashboard");
                      }
                    }}
                    className={`relative flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/25 shadow-sm"
                        : "border-transparent hover:bg-secondary/30 hover:border-border/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isActive && <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />}
                        <span className={`text-xs font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                          {group.name}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground block font-mono pl-2.5">
                        {group.memberCount} members · {group.problemCount} shared
                      </span>
                    </div>
                    
                    {group.isOwner && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setGroupToDelete(group);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0 ml-1 cursor-pointer"
                        title="Delete Squad"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom actions (no duplicate profile, matches mockup log-out/theme placement) */}
        <div className="p-4 border-t border-border/40 mt-auto flex flex-col gap-2 bg-secondary/5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-medium text-muted-foreground">App Theme</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground" onClick={toggleTheme}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-9 justify-start px-2 gap-2.5 hover:text-destructive hover:bg-destructive/10 text-muted-foreground cursor-pointer rounded-lg border border-transparent hover:border-destructive/10"
            onClick={() => {
              logout();
              navigate("/auth");
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-semibold">Log out</span>
          </Button>
        </div>
      </aside>

      {/* Main dashboard content container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Context top-bar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 h-14 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold uppercase tracking-wider text-foreground font-mono flex items-center gap-1.5">
              {currentTitle}
              {location.pathname === "/dashboard" && activeGroupSummary && (
                <>
                  <span className="text-muted-foreground/40 font-sans">/</span>
                  <span className="text-xs font-semibold text-primary font-sans lowercase">
                    @{activeGroupSummary.name}
                  </span>
                </>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Friends Manager Notification */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 relative rounded-lg cursor-pointer ${friendsManagerTab ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => setFriendsManagerTab(pendingRequestCount > 0 ? "requests" : "friends")}
                >
                  <Users className="w-4.5 h-4.5" />
                  {pendingRequestCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {pendingRequestCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Friends Console</TooltipContent>
            </Tooltip>

            {/* Mobile-only menu placeholders are handled below */}
            <div className="md:hidden flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 cursor-pointer" onClick={toggleTheme}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 hover:text-destructive hover:bg-destructive/10 text-muted-foreground cursor-pointer"
                onClick={() => {
                  logout();
                  navigate("/auth");
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
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
