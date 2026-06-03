import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const useProblemNotifications = () => {
  const { user } = useAuth();
  const maxProblemIdRef = useRef<number | null>(null);

  useQuery({
    queryKey: ["problemsFeed"],
    queryFn: async () => {
      const problems = await api.getProblemsFeed();

      if (problems && problems.length > 0) {
        const maxId = Math.max(...problems.map((problem) => Number(problem.id)));

        if (maxProblemIdRef.current !== null && maxId > maxProblemIdRef.current) {
          const newProblems = problems.filter((problem) => Number(problem.id) > maxProblemIdRef.current!);

          const isEnabled =
            typeof localStorage !== "undefined" && typeof localStorage.getItem === "function"
              ? localStorage.getItem("algosphere_notificationsEnabled") !== "false"
              : true;

          if ("Notification" in window && Notification.permission === "granted" && isEnabled) {
            newProblems.forEach((problem) => {
              if (problem.sharedBy !== user?.username) {
                new Notification("New problem shared!", {
                  body: `${problem.sharedBy} posted "${problem.title}" on ${problem.platform}`,
                  icon: "/favicon.ico",
                });
              }
            });
          }
        }

        if (maxProblemIdRef.current === null || maxId > maxProblemIdRef.current) {
          maxProblemIdRef.current = maxId;
        }
      }

      return problems;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
};
