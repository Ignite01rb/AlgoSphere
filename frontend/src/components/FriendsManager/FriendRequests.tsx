import { UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import type { FriendRequest } from "@/lib/types";

type FriendRequestsProps = {
  requests: FriendRequest[];
  onAccept: (id: number) => void;
  isAccepting: boolean;
  onReject: (id: number) => void;
  isRejecting: boolean;
};

export const FriendRequests = ({ requests, onAccept, isAccepting, onReject, isRejecting }: FriendRequestsProps) => {
  if (requests.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <UserPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-base text-muted-foreground">No pending requests</p>
        <p className="text-sm text-muted-foreground/70 mt-1">When someone sends you a request, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{req.fromUser.displayName.charAt(0)}</span>
            </div>
            <div>
              <span className="text-base font-medium text-foreground">{req.fromUser.displayName}</span>
              <span className="block text-sm text-muted-foreground">@{req.fromUser.username} · {formatRelativeTime(req.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="default"
              size="sm"
              className="h-8 text-sm gap-1"
              onClick={() => onAccept(req.id)}
              disabled={isAccepting}
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onReject(req.id)}
              disabled={isRejecting}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
