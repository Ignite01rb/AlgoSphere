import { Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Friend } from "@/lib/types";

type FriendsListProps = {
  friends: Friend[];
  onRemove: (friend: Friend) => void;
  onSearch: () => void;
};

export const FriendsList = ({ friends, onRemove, onSearch }: FriendsListProps) => {
  if (friends.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-base text-muted-foreground">You don't have any friends yet</p>
        <Button variant="link" onClick={onSearch} className="mt-2 text-primary">
          Find friends
        </Button>
      </div>
    );
  }

  return (
    <div className="py-1">
      {friends.map((friend) => (
        <div key={friend.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{friend.displayName.charAt(0)}</span>
            </div>
            <div>
              <span className="text-base font-medium text-foreground">{friend.displayName}</span>
              <span className="block text-sm text-muted-foreground">@{friend.username}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm text-muted-foreground hover:text-destructive gap-1.5"
            onClick={() => onRemove(friend)}
          >
            <UserX className="w-4 h-4" /> Remove
          </Button>
        </div>
      ))}
    </div>
  );
};
