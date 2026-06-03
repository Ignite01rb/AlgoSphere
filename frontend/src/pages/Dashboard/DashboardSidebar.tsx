import { Compass, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupCard, type Group } from "@/components/GroupCard";

type DashboardSidebarProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setShowCreateGroup: (show: boolean) => void;
  setShowDiscover: (show: boolean) => void;
  pendingJoinCount: number;
  filteredGroups: Group[];
  activeGroup: number | null;
  setActiveGroup: (id: number) => void;
  setGroupToDelete: (group: Group) => void;
};

export const DashboardSidebar = ({
  searchQuery,
  setSearchQuery,
  setShowCreateGroup,
  setShowDiscover,
  pendingJoinCount,
  filteredGroups,
  activeGroup,
  setActiveGroup,
  setGroupToDelete,
}: DashboardSidebarProps) => {
  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col h-full border-r border-border/40 bg-sidebar/20 backdrop-blur-sm">
      <div className="p-4 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search squads..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9.5 h-9 text-xs border border-border/40 bg-secondary/30 focus-visible:ring-1 focus-visible:ring-primary/45 rounded-lg shadow-none"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs font-semibold gap-1.5 border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all rounded-lg"
          onClick={() => setShowCreateGroup(true)}
        >
          <Plus className="w-4 h-4" />
          Create Squad
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs font-semibold gap-1.5 border-border/60 hover:bg-secondary/60 transition-all rounded-lg relative"
          onClick={() => setShowDiscover(true)}
        >
          <Compass className="w-4 h-4" />
          Discover Squads
          {pendingJoinCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {pendingJoinCount}
            </span>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-3 py-2 block">
          Your Squads ({filteredGroups.length})
        </span>
        {filteredGroups.map((group, index) => (
          <GroupCard
            key={group.id}
            group={group}
            isActive={activeGroup === group.id}
            onClick={() => setActiveGroup(Number(group.id))}
            onDelete={() => setGroupToDelete(group)}
            index={index}
          />
        ))}
      </div>
    </aside>
  );
};
