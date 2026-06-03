import { describe, expect, it } from "vitest";

import { getPlatformDetails } from "./PlatformIcons";

describe("getPlatformDetails", () => {
  it("matches supported platforms by URL host", () => {
    expect(getPlatformDetails("https://leetcode.com/problems/two-sum/").name).toBe("LeetCode");
    expect(getPlatformDetails("https://atcoder.jp/contests/dp/tasks/dp_a").name).toBe("AtCoder");
    expect(getPlatformDetails("https://www.geeksforgeeks.org/problems/count-pairs-with-given-sum").name).toBe(
      "GeeksForGeeks"
    );
    expect(getPlatformDetails("https://coderbyte.com/challenges/sum-of-primes").id).toBe("coder");
    expect(getPlatformDetails("https://coder.com").id).toBe("coder-enterprise");
  });

  it("matches supported platforms by display name and common phrasing", () => {
    expect(getPlatformDetails("CodeChef").name).toBe("CodeChef");
    expect(getPlatformDetails("ad code").name).toBe("AtCoder");
    expect(getPlatformDetails("top coder").name).toBe("TopCoder");
  });

  it("falls back cleanly for unknown sources", () => {
    expect(getPlatformDetails("https://example.com/problem")).toEqual(
      expect.objectContaining({ id: "platform", name: "Platform" })
    );
  });
});
