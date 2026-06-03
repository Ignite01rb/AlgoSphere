import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./format";

describe("formatRelativeTime", () => {
  it("returns the empty state copy when no timestamp is provided", () => {
    expect(formatRelativeTime()).toBe("No activity yet");
  });

  it("formats past timestamps with an ago suffix", () => {
    const timestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    expect(formatRelativeTime(timestamp)).toMatch(/minute/);
    expect(formatRelativeTime(timestamp)).toMatch(/ago$/);
  });
});
