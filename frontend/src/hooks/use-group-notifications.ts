import { useEffect, useRef } from "react";

import type { Problem } from "@/lib/types";

export function useGroupNotifications(
  problems: Problem[],
  groupName: string | null,
  activeGroupId: number | null,
) {
  const seenIds = useRef<Set<string | number>>(new Set());
  const initialized = useRef(false);
  const prevGroupId = useRef<number | null>(null);

  useEffect(() => {
    if (prevGroupId.current !== activeGroupId) {
      seenIds.current = new Set();
      initialized.current = false;
      prevGroupId.current = activeGroupId;
    }

    if (!groupName) return;

    if (!initialized.current) {
      problems.forEach((problem) => seenIds.current.add(problem.id));
      initialized.current = true;
      return;
    }

    if (!problems.length) return;

    const newProblems = problems.filter((problem) => !seenIds.current.has(problem.id));
    if (newProblems.length === 0) return;

    newProblems.forEach((problem) => seenIds.current.add(problem.id));

    const isEnabled =
      typeof localStorage !== "undefined" && typeof localStorage.getItem === "function"
        ? localStorage.getItem("algosphere_notificationsEnabled") !== "false"
        : true;

    if (typeof Notification === "undefined" || Notification.permission !== "granted" || !isEnabled) return;

    newProblems.forEach((problem) => {
      const notification = new Notification(`New problem in ${groupName}`, {
        body: `${problem.title} · ${problem.difficulty}\nShared by @${problem.sharedBy}`,
        icon: "/favicon.ico",
        tag: `algosphere-problem-${String(problem.id)}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    });
  }, [problems, groupName, activeGroupId]);
}
