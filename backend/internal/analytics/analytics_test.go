package analytics

import (
	"testing"
	"time"
)

func TestBuildAnalyticsAggregatesTopProblemsAndPlatforms(t *testing.T) {
	now := time.Now().UTC()
	contest := "LeetCode Top Interview 150"
	cfContest := "Codeforces Beta Round 4"
	problems := []ProblemRecord{
		{Title: "Two Sum", Contest: &contest, Difficulty: "Easy", Platform: "leetcode", SharedAt: now, ProblemSignature: "leetcode::two-sum", SharedByUsername: "alex"},
		{Title: "Two Sum", Contest: &contest, Difficulty: "Easy", Platform: "leetcode", SharedAt: now.Add(-24 * time.Hour), ProblemSignature: "leetcode::two-sum", SharedByUsername: "maya"},
		{Title: "Watermelon", Contest: &cfContest, Difficulty: "Easy", Platform: "codeforces", SharedAt: now.Add(-48 * time.Hour), ProblemSignature: "codeforces::4A", SharedByUsername: "alex"},
	}

	response := Build(problems)
	if response.Stats[0].Value != "3" {
		t.Fatalf("expected 3 total problems, got %s", response.Stats[0].Value)
	}
	if len(response.TopProblems) == 0 || response.TopProblems[0].Title != "Two Sum" || response.TopProblems[0].Shares != 2 {
		t.Fatalf("unexpected top problems: %#v", response.TopProblems)
	}
	if len(response.PlatformLoyalty) == 0 || response.PlatformLoyalty[0].Name != "LeetCode" {
		t.Fatalf("unexpected platform loyalty: %#v", response.PlatformLoyalty)
	}
}
