import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Problem } from "@/lib/types";

import { useGroupNotifications } from "./use-group-notifications";

const notificationSpy = vi.fn();

class MockNotification {
  static permission: NotificationPermission = "granted";

  onclick: (() => void) | null = null;

  close = vi.fn();

  constructor(title: string, options?: NotificationOptions) {
    notificationSpy({ title, options });
  }
}

function HookHarness({
  activeGroupId,
  groupName,
  problems,
}: {
  activeGroupId: number | null;
  groupName: string | null;
  problems: Problem[];
}) {
  useGroupNotifications(problems, groupName, activeGroupId);
  return null;
}

describe("useGroupNotifications", () => {
  afterEach(() => {
    notificationSpy.mockReset();
    vi.unstubAllGlobals();
  });

  it("notifies when the first problem arrives after an initially empty squad", () => {
    vi.stubGlobal("Notification", MockNotification);

    const { rerender } = render(<HookHarness activeGroupId={1} groupName="Graph Squad" problems={[]} />);

    expect(notificationSpy).not.toHaveBeenCalled();

    rerender(
      <HookHarness
        activeGroupId={1}
        groupName="Graph Squad"
        problems={[
          {
            id: 42,
            title: "Number of Islands",
            contest: "LeetCode Graph Theory",
            difficulty: "Medium",
            url: "https://leetcode.com/problems/number-of-islands/",
            platform: "LeetCode",
            sharedBy: "alice",
            sharedAt: "2026-03-17T19:00:00Z",
          },
        ]}
      />
    );

    expect(notificationSpy).toHaveBeenCalledTimes(1);
    expect(notificationSpy).toHaveBeenCalledWith({
      title: "New problem in Graph Squad",
      options: expect.objectContaining({
        body: "Number of Islands · Medium\nShared by @alice",
        tag: "algosphere-problem-42",
      }),
    });
  });
});
