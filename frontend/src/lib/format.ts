import { formatDistanceToNow } from "date-fns";

export const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return "No activity yet";
  }

  return `${formatDistanceToNow(new Date(value), { addSuffix: false })} ago`;
};
