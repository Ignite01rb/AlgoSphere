package analytics

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"algosphere/backend/internal/metadata"
)

type ProblemRecord struct {
	Title             string
	Contest           *string
	Difficulty        string
	Platform          string
	PlatformProblemID *string
	SharedAt          time.Time
	ProblemSignature  string
	SharedByUsername  string
}

type StatPoint struct {
	Label  string  `json:"label"`
	Value  string  `json:"value"`
	Change *string `json:"change,omitempty"`
}

type DistributionPoint struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

type PlatformPoint struct {
	Name     string `json:"name"`
	Problems int    `json:"problems"`
}

type DailyPoint struct {
	Day      string `json:"day"`
	Problems int    `json:"problems"`
}

type MonthlyPoint struct {
	Month    string `json:"month"`
	Problems int    `json:"problems"`
}

type MemberLeaderboardEntry struct {
	Name          string `json:"name"`
	Problems      int    `json:"problems"`
	TopDifficulty string `json:"topDifficulty"`
}

type TopProblemEntry struct {
	Title      string  `json:"title"`
	Contest    *string `json:"contest,omitempty"`
	Shares     int     `json:"shares"`
	Difficulty string  `json:"difficulty"`
}

type PlatformDifficultyItem struct {
	Tier    string `json:"tier"`
	Count   int    `json:"count"`
	Percent int    `json:"percent"`
}

type PlatformDifficultyGroup struct {
	Platform string                   `json:"platform"`
	Items    []PlatformDifficultyItem `json:"items"`
}

type Response struct {
	Stats                  []StatPoint               `json:"stats"`
	DifficultyDistribution []DistributionPoint       `json:"difficultyDistribution"`
	PlatformDifficulty     []PlatformDifficultyGroup `json:"platformDifficulty"`
	PlatformLoyalty        []PlatformPoint           `json:"platformLoyalty"`
	WeeklyActivity         []DailyPoint              `json:"weeklyActivity"`
	MonthlyTrend           []MonthlyPoint            `json:"monthlyTrend"`
	MemberLeaderboard      []MemberLeaderboardEntry  `json:"memberLeaderboard"`
	TopProblems            []TopProblemEntry         `json:"topProblems"`
}

var windowMap = map[string]int{
	"7d":  7,
	"30d": 30,
	"90d": 90,
	"all": 0,
}

func FilterByWindow(problems []ProblemRecord, window string, now time.Time) []ProblemRecord {
	days, ok := windowMap[window]
	if !ok {
		days = 30
	}
	if days == 0 {
		return problems
	}
	threshold := now.UTC().AddDate(0, 0, -days)
	filtered := make([]ProblemRecord, 0, len(problems))
	for _, problem := range problems {
		if problem.SharedAt.After(threshold) || problem.SharedAt.Equal(threshold) {
			filtered = append(filtered, problem)
		}
	}
	return filtered
}

func Build(problems []ProblemRecord) Response {
	totalProblems := len(problems)
	contestSet := make(map[string]struct{})
	difficultyCounts := make(map[string]int)
	platformCounts := make(map[string]int)
	labels := metadata.PlatformLabels()

	for _, problem := range problems {
		if problem.Contest != nil && *problem.Contest != "" {
			contestSet[normalizeValue(*problem.Contest)] = struct{}{}
		}
		difficulty := metadata.NormalizeDifficultyForPlatform(problem.Platform, problem.Difficulty, problem.PlatformProblemID)
		difficultyCounts[difficulty]++
		platformCounts[problem.Platform]++
	}

	contestCount := len(contestSet)
	weeksDivisor := 1
	if totalProblems > 14 {
		weeksDivisor = totalProblems / 7
		if weeksDivisor < 1 {
			weeksDivisor = 1
		}
	}
	avgPerWeek := 0
	if totalProblems > 0 {
		avgPerWeek = totalProblems / weeksDivisor
	}

	previousProblems := 0
	if totalProblems > 0 {
		previousProblems = totalProblems - max(1, totalProblems/5)
		if previousProblems < 1 {
			previousProblems = 1
		}
	}
	problemChange := percentChange(previousProblems, totalProblems)
	contestChange := percentChange(max(contestCount-2, 1), contestCount)

	stats := []StatPoint{
		{Label: "Total problems", Value: fmt.Sprintf("%d", totalProblems), Change: problemChange},
		{Label: "Unique contests", Value: fmt.Sprintf("%d", contestCount), Change: contestChange},
		{Label: "Difficulty tiers", Value: fmt.Sprintf("%d", len(difficultyCounts)), Change: plusString(max(len(difficultyCounts)-1, 0))},
		{Label: "Avg. per week", Value: fmt.Sprintf("%d", avgPerWeek)},
	}

	difficultyDistribution := buildDifficultyDistribution(difficultyCounts, totalProblems)
	platformDifficulty := buildPlatformDifficulty(problems)
	platformLoyalty := buildPlatformLoyalty(platformCounts, labels)
	weeklyActivity := buildWeeklyActivity(problems)
	monthlyTrend := buildMonthlyTrend(problems)
	memberLeaderboard := buildMemberLeaderboard(problems)
	topProblems := buildTopProblems(problems)

	return Response{
		Stats:                  stats,
		DifficultyDistribution: difficultyDistribution,
		PlatformDifficulty:     platformDifficulty,
		PlatformLoyalty:        platformLoyalty,
		WeeklyActivity:         weeklyActivity,
		MonthlyTrend:           monthlyTrend,
		MemberLeaderboard:      memberLeaderboard,
		TopProblems:            topProblems,
	}
}

func buildDifficultyDistribution(counts map[string]int, total int) []DistributionPoint {
	if total == 0 {
		return []DistributionPoint{}
	}
	type pair struct {
		name  string
		count int
	}
	pairs := make([]pair, 0, len(counts))
	for name, count := range counts {
		pairs = append(pairs, pair{name: name, count: count})
	}
	sort.Slice(pairs, func(i, j int) bool {
		if pairs[i].count == pairs[j].count {
			return pairs[i].name < pairs[j].name
		}
		return pairs[i].count > pairs[j].count
	})
	limit := min(6, len(pairs))
	result := make([]DistributionPoint, 0, limit)
	for _, item := range pairs[:limit] {
		result = append(result, DistributionPoint{
			Name:  item.name,
			Value: roundPercent(item.count, total),
		})
	}
	return result
}

func buildPlatformDifficulty(problems []ProblemRecord) []PlatformDifficultyGroup {
	grouped := make(map[string][]ProblemRecord)
	for _, problem := range problems {
		grouped[problem.Platform] = append(grouped[problem.Platform], problem)
	}
	type pair struct {
		platform string
		problems []ProblemRecord
	}
	pairs := make([]pair, 0, len(grouped))
	for platform, items := range grouped {
		pairs = append(pairs, pair{platform: platform, problems: items})
	}
	sort.Slice(pairs, func(i, j int) bool {
		return len(pairs[i].problems) > len(pairs[j].problems)
	})

	labels := metadata.PlatformLabels()
	result := make([]PlatformDifficultyGroup, 0, len(pairs))
	for _, item := range pairs {
		counts := make(map[string]int)
		for _, problem := range item.problems {
			normalized := metadata.NormalizeDifficultyForPlatform(problem.Platform, problem.Difficulty, problem.PlatformProblemID)
			tier := tierForPlatform(problem.Platform, normalized)
			counts[tier]++
		}
		ordered := orderedTiers(item.platform, counts)
		points := make([]PlatformDifficultyItem, 0, len(ordered))
		for _, tier := range ordered {
			points = append(points, PlatformDifficultyItem{
				Tier:    tier,
				Count:   counts[tier],
				Percent: roundPercent(counts[tier], len(item.problems)),
			})
		}
		result = append(result, PlatformDifficultyGroup{
			Platform: labels[item.platform],
			Items:    points,
		})
	}
	return result
}

func buildPlatformLoyalty(platformCounts map[string]int, labels map[string]string) []PlatformPoint {
	type pair struct {
		platform string
		count    int
	}
	pairs := make([]pair, 0, len(platformCounts))
	for platform, count := range platformCounts {
		pairs = append(pairs, pair{platform: platform, count: count})
	}
	sort.Slice(pairs, func(i, j int) bool {
		if pairs[i].count == pairs[j].count {
			return pairs[i].platform < pairs[j].platform
		}
		return pairs[i].count > pairs[j].count
	})
	result := make([]PlatformPoint, 0, len(pairs))
	for _, item := range pairs {
		result = append(result, PlatformPoint{Name: labels[item.platform], Problems: item.count})
	}
	return result
}

func buildWeeklyActivity(problems []ProblemRecord) []DailyPoint {
	labels := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
	counts := map[string]int{"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0}
	for _, problem := range problems {
		counts[problem.SharedAt.UTC().Format("Mon")]++
	}
	result := make([]DailyPoint, 0, len(labels))
	for _, day := range labels {
		result = append(result, DailyPoint{Day: day, Problems: counts[day]})
	}
	return result
}

func buildMonthlyTrend(problems []ProblemRecord) []MonthlyPoint {
	order := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	counts := make(map[string]int)
	for _, problem := range problems {
		counts[problem.SharedAt.UTC().Format("Jan")]++
	}
	result := make([]MonthlyPoint, 0, len(order))
	for _, month := range order {
		if counts[month] == 0 {
			continue
		}
		result = append(result, MonthlyPoint{Month: month, Problems: counts[month]})
	}
	return result
}

func buildMemberLeaderboard(problems []ProblemRecord) []MemberLeaderboardEntry {
	grouped := make(map[string][]ProblemRecord)
	for _, problem := range problems {
		grouped[problem.SharedByUsername] = append(grouped[problem.SharedByUsername], problem)
	}
	type pair struct {
		username string
		problems []ProblemRecord
	}
	pairs := make([]pair, 0, len(grouped))
	for username, items := range grouped {
		pairs = append(pairs, pair{username: username, problems: items})
	}
	sort.Slice(pairs, func(i, j int) bool {
		if len(pairs[i].problems) == len(pairs[j].problems) {
			return pairs[i].username < pairs[j].username
		}
		return len(pairs[i].problems) > len(pairs[j].problems)
	})
	limit := min(6, len(pairs))
	result := make([]MemberLeaderboardEntry, 0, limit)
	for _, item := range pairs[:limit] {
		topDifficulty := ""
		counts := make(map[string]int)
		maxCount := 0
		for _, problem := range item.problems {
			difficulty := metadata.NormalizeDifficultyForPlatform(problem.Platform, problem.Difficulty, problem.PlatformProblemID)
			counts[difficulty]++
			if counts[difficulty] > maxCount || (counts[difficulty] == maxCount && difficulty < topDifficulty) {
				maxCount = counts[difficulty]
				topDifficulty = difficulty
			}
		}
		result = append(result, MemberLeaderboardEntry{
			Name:          "@" + item.username,
			Problems:      len(item.problems),
			TopDifficulty: topDifficulty,
		})
	}
	return result
}

func buildTopProblems(problems []ProblemRecord) []TopProblemEntry {
	grouped := make(map[string][]ProblemRecord)
	for _, problem := range problems {
		grouped[problem.ProblemSignature] = append(grouped[problem.ProblemSignature], problem)
	}
	type pair struct {
		signature string
		problems  []ProblemRecord
	}
	pairs := make([]pair, 0, len(grouped))
	for signature, items := range grouped {
		pairs = append(pairs, pair{signature: signature, problems: items})
	}
	sort.Slice(pairs, func(i, j int) bool {
		if len(pairs[i].problems) == len(pairs[j].problems) {
			return pairs[i].signature < pairs[j].signature
		}
		return len(pairs[i].problems) > len(pairs[j].problems)
	})
	limit := min(5, len(pairs))
	result := make([]TopProblemEntry, 0, limit)
	for _, item := range pairs[:limit] {
		representative := item.problems[0]
		result = append(result, TopProblemEntry{
			Title:      representative.Title,
			Contest:    representative.Contest,
			Shares:     len(item.problems),
			Difficulty: metadata.NormalizeDifficultyForPlatform(representative.Platform, representative.Difficulty, representative.PlatformProblemID),
		})
	}
	return result
}

func orderedTiers(platform string, counts map[string]int) []string {
	orders := map[string][]string{
		metadata.PlatformCodeforces: {"Newbie", "Pupil", "Specialist", "Expert", "Candidate Master", "Master", "Grandmaster"},
		metadata.PlatformCodeChef:   {"1★", "2★", "3★", "4★", "5★", "6★", "7★"},
		metadata.PlatformAtCoder:    {"Gray", "Brown", "Green", "Cyan", "Blue", "Yellow", "Orange", "Red"},
		metadata.PlatformLeetCode:   {"Easy", "Medium", "Hard"},
	}
	seen := make(map[string]struct{})
	result := make([]string, 0, len(counts))
	if order, ok := orders[platform]; ok {
		for _, tier := range order {
			if counts[tier] == 0 {
				continue
			}
			seen[tier] = struct{}{}
			result = append(result, tier)
		}
	}
	type pair struct {
		name  string
		count int
	}
	remaining := make([]pair, 0)
	for tier, count := range counts {
		if count == 0 {
			continue
		}
		if _, ok := seen[tier]; ok {
			continue
		}
		remaining = append(remaining, pair{name: tier, count: count})
	}
	sort.Slice(remaining, func(i, j int) bool {
		if remaining[i].count == remaining[j].count {
			return remaining[i].name < remaining[j].name
		}
		return remaining[i].count > remaining[j].count
	})
	for _, item := range remaining {
		result = append(result, item.name)
	}
	return result
}

func tierForPlatform(platform string, difficulty string) string {
	legacyCF := map[string]string{"Easy": "Newbie", "Medium": "Specialist", "Hard": "Expert"}
	legacyCC := map[string]string{"Easy": "1★", "Medium": "3★", "Hard": "5★"}
	legacyAC := map[string]string{"Easy": "Gray", "Medium": "Green", "Hard": "Blue"}

	switch platform {
	case metadata.PlatformCodeforces:
		if mapped, ok := legacyCF[difficulty]; ok {
			return mapped
		}
		rating, err := strconv.Atoi(difficulty)
		if err != nil {
			return difficulty
		}
		switch {
		case rating < 1200:
			return "Newbie"
		case rating < 1400:
			return "Pupil"
		case rating < 1600:
			return "Specialist"
		case rating < 1900:
			return "Expert"
		case rating < 2100:
			return "Candidate Master"
		case rating < 2400:
			return "Master"
		default:
			return "Grandmaster"
		}
	case metadata.PlatformCodeChef:
		if mapped, ok := legacyCC[difficulty]; ok {
			return mapped
		}
		return difficulty
	case metadata.PlatformAtCoder:
		if mapped, ok := legacyAC[difficulty]; ok {
			return mapped
		}
		return difficulty
	default:
		return difficulty
	}
}

func normalizeValue(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func percentChange(previous int, current int) *string {
	if previous <= 0 {
		return nil
	}
	change := (float64(current-previous) / float64(previous)) * 100
	sign := ""
	if change >= 0 {
		sign = "+"
	}
	value := fmt.Sprintf("%s%d%%", sign, int(math.Round(change)))
	return &value
}

func plusString(value int) *string {
	if value <= 0 {
		return nil
	}
	result := fmt.Sprintf("+%d", value)
	return &result
}

func roundPercent(part int, total int) int {
	if total == 0 {
		return 0
	}
	return int(math.Round((float64(part) / float64(total)) * 100))
}

func min(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
