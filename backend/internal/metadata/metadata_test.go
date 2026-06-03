package metadata

import "testing"

func TestDetectPlatformSupportsCoreSites(t *testing.T) {
	cases := map[string]string{
		"https://leetcode.com/problems/two-sum/":                                 PlatformLeetCode,
		"https://codeforces.com/problemset/problem/4/A":                          PlatformCodeforces,
		"https://www.codechef.com/problems/FLOW001":                              PlatformCodeChef,
		"https://atcoder.jp/contests/dp/tasks/dp_a":                              PlatformAtCoder,
		"https://www.hackerrank.com/challenges/ctci-array-left-rotation/problem": PlatformHackerRank,
	}

	for rawURL, want := range cases {
		got, err := DetectPlatform(rawURL)
		if err != nil {
			t.Fatalf("detect platform for %s: %v", rawURL, err)
		}
		if got != want {
			t.Fatalf("expected %s for %s, got %s", want, rawURL, got)
		}
	}
}

func TestResolveProblemUsesCatalogAndFallback(t *testing.T) {
	known, err := ResolveProblem("https://leetcode.com/problems/two-sum/")
	if err != nil {
		t.Fatalf("resolve known problem: %v", err)
	}
	if known.Title != "Two Sum" || known.Difficulty != "Easy" || known.Platform != PlatformLeetCode {
		t.Fatalf("unexpected known problem resolution: %#v", known)
	}

	unknown, err := ResolveProblem("https://leetcode.com/problems/merge-intervals-ii/")
	if err != nil {
		t.Fatalf("resolve fallback problem: %v", err)
	}
	if unknown.Title != "Merge Intervals Ii" || unknown.Platform != PlatformLeetCode {
		t.Fatalf("unexpected fallback resolution: %#v", unknown)
	}
}
