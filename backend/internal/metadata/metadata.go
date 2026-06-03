package metadata

import (
	"fmt"
	"hash/fnv"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"algosphere/backend/internal/apperror"
)

const (
	PlatformLeetCode      = "leetcode"
	PlatformCodeforces    = "codeforces"
	PlatformCodeChef      = "codechef"
	PlatformAtCoder       = "atcoder"
	PlatformHackerRank    = "hackerrank"
	PlatformTopCoder      = "topcoder"
	PlatformGeeksForGeeks = "geeksforgeeks"
	PlatformCoder         = "coder"
)

var (
	platformLabels = map[string]string{
		PlatformLeetCode:      "LeetCode",
		PlatformCodeforces:    "Codeforces",
		PlatformCodeChef:      "CodeChef",
		PlatformAtCoder:       "AtCoder",
		PlatformHackerRank:    "HackerRank",
		PlatformTopCoder:      "TopCoder",
		PlatformGeeksForGeeks: "GeeksforGeeks",
		PlatformCoder:         "Coder",
	}
	supportedHosts = map[string]string{
		"leetcode.com":          PlatformLeetCode,
		"www.leetcode.com":      PlatformLeetCode,
		"codeforces.com":        PlatformCodeforces,
		"www.codeforces.com":    PlatformCodeforces,
		"codechef.com":          PlatformCodeChef,
		"www.codechef.com":      PlatformCodeChef,
		"atcoder.jp":            PlatformAtCoder,
		"www.atcoder.jp":        PlatformAtCoder,
		"hackerrank.com":        PlatformHackerRank,
		"www.hackerrank.com":    PlatformHackerRank,
		"topcoder.com":          PlatformTopCoder,
		"www.topcoder.com":      PlatformTopCoder,
		"geeksforgeeks.org":     PlatformGeeksForGeeks,
		"www.geeksforgeeks.org": PlatformGeeksForGeeks,
		"coderbyte.com":         PlatformCoder,
		"www.coderbyte.com":     PlatformCoder,
		"coder.com":             PlatformCoder,
		"www.coder.com":         PlatformCoder,
	}
	catalog = map[string]CatalogEntry{
		key(PlatformLeetCode, "two-sum"):                         {Title: "Two Sum", Contest: "LeetCode Top Interview 150", Tags: "arrays,hashing", Difficulty: "Easy", SolvedByCount: intPtr(5938247)},
		key(PlatformLeetCode, "number-of-islands"):               {Title: "Number of Islands", Contest: "LeetCode Graph Theory", Tags: "graphs,dfs,bfs,matrix", Difficulty: "Medium", SolvedByCount: intPtr(1902478)},
		key(PlatformLeetCode, "lru-cache"):                       {Title: "LRU Cache", Contest: "LeetCode System Design", Tags: "design,hashing,linked-list", Difficulty: "Medium", SolvedByCount: intPtr(1398421)},
		key(PlatformLeetCode, "binary-tree-maximum-path-sum"):    {Title: "Binary Tree Maximum Path Sum", Contest: "LeetCode Trees", Tags: "trees,dfs,dynamic-programming", Difficulty: "Hard", SolvedByCount: intPtr(681223)},
		key(PlatformCodeforces, "4A"):                            {Title: "Watermelon", Contest: "Codeforces Beta Round 4", Tags: "math,bruteforce", Difficulty: "800", SolvedByCount: intPtr(514287)},
		key(PlatformCodeforces, "158A"):                          {Title: "Next Round", Contest: "Codeforces Beta Round 158", Tags: "implementation,sorting", Difficulty: "1300", SolvedByCount: intPtr(482119)},
		key(PlatformCodeforces, "71A"):                           {Title: "Way Too Long Words", Contest: "Codeforces Beta Round 71", Tags: "strings,implementation", Difficulty: "1700", SolvedByCount: intPtr(662904)},
		key(PlatformCodeChef, "FLOW001"):                         {Title: "Add Two Numbers", Contest: "CodeChef Practice", Tags: "implementation,ad-hoc", Difficulty: "1★", SolvedByCount: intPtr(371104)},
		key(PlatformCodeChef, "START01"):                         {Title: "Number Mirror", Contest: "CodeChef Beginner", Tags: "basics,io", Difficulty: "2★", SolvedByCount: intPtr(294417)},
		key(PlatformCodeChef, "HS08TEST"):                        {Title: "ATM", Contest: "CodeChef Practice", Tags: "math,implementation", Difficulty: "3★", SolvedByCount: intPtr(285554)},
		key(PlatformAtCoder, "dp_a"):                             {Title: "Frog 1", Contest: "Educational DP Contest", Tags: "dynamic-programming", Difficulty: "Gray", SolvedByCount: intPtr(241221)},
		key(PlatformAtCoder, "abc085_c"):                         {Title: "Otoshidama", Contest: "AtCoder Beginner Contest 085", Tags: "bruteforce,math", Difficulty: "Green", SolvedByCount: intPtr(183100)},
		key(PlatformHackerRank, "ctci-array-left-rotation"):      {Title: "Array Left Rotation", Contest: "Cracking the Coding Interview", Tags: "arrays,rotation", Difficulty: "Easy", SolvedByCount: intPtr(925441)},
		key(PlatformHackerRank, "sherlock-and-anagrams"):         {Title: "Sherlock and Anagrams", Contest: "Interview Preparation Kit", Tags: "strings,hashing", Difficulty: "Medium", SolvedByCount: intPtr(441320)},
		key(PlatformTopCoder, "SRM-849-div2-250"):                {Title: "Contest Scoreboard", Contest: "SRM 849", Tags: "implementation,simulation", Difficulty: "Medium", SolvedByCount: intPtr(21045)},
		key(PlatformGeeksForGeeks, "count-pairs-with-given-sum"): {Title: "Count Pairs With Given Sum", Contest: "GeeksForGeeks Practice", Tags: "arrays,hashing", Difficulty: "Medium", SolvedByCount: intPtr(158230)},
		key(PlatformCoder, "sum-of-primes"):                      {Title: "Sum of Primes", Contest: "Coder Sprint", Tags: "math,sieve,number-theory", Difficulty: "Medium", SolvedByCount: intPtr(84210)},
	}
	reLeetCode   = regexp.MustCompile(`/problems/([^/]+)`)
	reCodeforces = regexp.MustCompile(`/(?:problemset/problem|contest)/(\d+)/(?:problem/)?([A-Za-z0-9]+)`)
	reAtCoder    = regexp.MustCompile(`/tasks/([^/]+)`)
	reHackerRank = regexp.MustCompile(`/challenges/([^/]+)`)
)

type CatalogEntry struct {
	Title         string
	Contest       string
	Tags          string
	Difficulty    string
	ThumbnailURL  *string
	SolvedByCount *int
}

type ResolvedProblem struct {
	Platform          string  `json:"platform"`
	ProblemURL        string  `json:"problemUrl"`
	PlatformProblemID *string `json:"platformProblemId"`
	Title             string  `json:"title"`
	Contest           *string `json:"contest"`
	Tags              *string `json:"tags"`
	Difficulty        string  `json:"difficulty"`
	ThumbnailURL      *string `json:"thumbnailUrl"`
	SolvedByCount     *int    `json:"solvedByCount"`
}

func (r ResolvedProblem) Signature() string {
	identifier := NormalizeText(r.Title)
	if r.PlatformProblemID != nil && *r.PlatformProblemID != "" {
		identifier = *r.PlatformProblemID
	}
	return fmt.Sprintf("%s::%s", r.Platform, identifier)
}

func PlatformLabels() map[string]string {
	out := make(map[string]string, len(platformLabels))
	for key, value := range platformLabels {
		out[key] = value
	}
	return out
}

func EnsureSupportedURL(rawURL string) (string, string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed == nil || parsed.Hostname() == "" {
		return "", "", apperror.BadRequest("Problem links must be valid HTTPS URLs.")
	}
	if parsed.Scheme != "https" {
		return "", "", apperror.BadRequest("Problem links must use HTTPS.")
	}
	if parsed.User != nil {
		return "", "", apperror.BadRequest("Problem links must not include credentials.")
	}
	if parsed.Fragment != "" {
		return "", "", apperror.BadRequest("Problem links must not include fragments.")
	}
	host := strings.ToLower(parsed.Hostname())
	if _, ok := supportedHosts[host]; !ok {
		return "", "", apperror.BadRequest("Unsupported coding platform. Use LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, or Coder.")
	}
	parsed.Host = host
	parsed.Path = strings.TrimRight(parsed.Path, "/")
	if parsed.Path == "" {
		parsed.Path = "/"
	}
	parsed.Scheme = "https"
	parsed.Fragment = ""
	return parsed.String(), host, nil
}

func DetectPlatform(rawURL string) (string, error) {
	_, host, err := EnsureSupportedURL(rawURL)
	if err != nil {
		return "", err
	}
	return supportedHosts[host], nil
}

func ExtractPlatformProblemID(rawURL string) (*string, error) {
	canonicalURL, host, err := EnsureSupportedURL(rawURL)
	if err != nil {
		return nil, err
	}
	parsed, _ := url.Parse(canonicalURL)
	path := parsed.Path
	platform := supportedHosts[host]

	switch platform {
	case PlatformLeetCode:
		match := reLeetCode.FindStringSubmatch(path)
		if len(match) == 2 {
			return stringPtr(strings.ToLower(match[1])), nil
		}
	case PlatformCodeforces:
		match := reCodeforces.FindStringSubmatch(path)
		if len(match) == 3 {
			return stringPtr(match[1] + strings.ToUpper(match[2])), nil
		}
	case PlatformCodeChef:
		parts := pathSegments(path)
		if len(parts) > 0 {
			return stringPtr(strings.ToUpper(parts[len(parts)-1])), nil
		}
	case PlatformAtCoder:
		match := reAtCoder.FindStringSubmatch(path)
		if len(match) == 2 {
			return stringPtr(strings.ToLower(match[1])), nil
		}
	case PlatformHackerRank:
		match := reHackerRank.FindStringSubmatch(path)
		if len(match) == 2 {
			return stringPtr(strings.ToLower(match[1])), nil
		}
	case PlatformTopCoder, PlatformGeeksForGeeks, PlatformCoder:
		parts := pathSegments(path)
		if len(parts) > 0 {
			value := parts[len(parts)-1]
			if platform != PlatformTopCoder {
				value = strings.ToLower(value)
			}
			return &value, nil
		}
	}

	return nil, nil
}

func ResolveProblem(rawURL string) (ResolvedProblem, error) {
	canonicalURL, _, err := EnsureSupportedURL(rawURL)
	if err != nil {
		return ResolvedProblem{}, err
	}
	platform, err := DetectPlatform(canonicalURL)
	if err != nil {
		return ResolvedProblem{}, err
	}
	problemID, err := ExtractPlatformProblemID(canonicalURL)
	if err != nil {
		return ResolvedProblem{}, err
	}

	entry, ok := catalog[key(platform, deref(problemID))]
	if !ok {
		entry = buildFallbackEntry(platform, problemID, canonicalURL)
	}

	return ResolvedProblem{
		Platform:          platform,
		ProblemURL:        canonicalURL,
		PlatformProblemID: problemID,
		Title:             entry.Title,
		Contest:           stringPtrIf(entry.Contest != "", entry.Contest),
		Tags:              stringPtrIf(entry.Tags != "", entry.Tags),
		Difficulty:        entry.Difficulty,
		ThumbnailURL:      entry.ThumbnailURL,
		SolvedByCount:     entry.SolvedByCount,
	}, nil
}

func NormalizeText(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := regexp.MustCompile(`[^a-z0-9]+`)
	return strings.Trim(replacer.ReplaceAllString(value, "-"), "-")
}

func NormalizeDifficultyForPlatform(platform string, difficulty string, problemID *string) string {
	generic := map[string]struct{}{
		"Easy":    {},
		"Medium":  {},
		"Hard":    {},
		"Unknown": {},
	}
	if _, ok := generic[difficulty]; !ok {
		return difficulty
	}

	switch platform {
	case PlatformLeetCode:
		return difficulty
	case PlatformCodeforces:
		buckets := map[string][]string{
			"Easy":    {"800", "900", "1000", "1100"},
			"Medium":  {"1200", "1400", "1500", "1600"},
			"Hard":    {"1800", "2000", "2100", "2400"},
			"Unknown": {"1200"},
		}
		values := buckets[difficulty]
		return values[stableBucket(platform+":"+derefDefault(problemID, "x"), len(values))]
	case PlatformCodeChef:
		native := map[string]string{"Easy": "1★", "Medium": "3★", "Hard": "5★", "Unknown": "2★"}
		return native[difficulty]
	case PlatformAtCoder:
		native := map[string]string{"Easy": "Gray", "Medium": "Green", "Hard": "Blue", "Unknown": "Brown"}
		return native[difficulty]
	default:
		return difficulty
	}
}

func buildFallbackEntry(platform string, problemID *string, canonicalURL string) CatalogEntry {
	parsed, _ := url.Parse(canonicalURL)
	parts := pathSegments(parsed.Path)
	rawSlug := deref(problemID)
	if rawSlug == "" && len(parts) > 0 {
		rawSlug = parts[len(parts)-1]
	}
	if rawSlug == "" {
		rawSlug = platformLabels[platform]
	}

	defaultDifficulty := "Medium"
	switch platform {
	case PlatformCodeforces:
		values := []string{"800", "1000", "1200", "1400", "1600", "1800", "2100", "2400"}
		defaultDifficulty = values[stableBucket(platform+":"+rawSlug, len(values))]
	case PlatformCodeChef:
		values := []string{"1★", "2★", "3★", "4★", "5★"}
		defaultDifficulty = values[stableBucket(platform+":"+rawSlug, len(values))]
	case PlatformAtCoder:
		values := []string{"Gray", "Brown", "Green", "Cyan", "Blue", "Yellow"}
		defaultDifficulty = values[stableBucket(platform+":"+rawSlug, len(values))]
	}

	contestByPlatform := map[string]string{
		PlatformLeetCode:      "LeetCode Practice Set",
		PlatformCodeforces:    "Codeforces Problemset",
		PlatformCodeChef:      "CodeChef Practice",
		PlatformAtCoder:       "AtCoder Practice",
		PlatformHackerRank:    "HackerRank Interview Prep",
		PlatformTopCoder:      "TopCoder Arena",
		PlatformGeeksForGeeks: "GeeksForGeeks Practice",
		PlatformCoder:         "Coder Challenge Track",
	}
	tagsByPlatform := map[string]string{
		PlatformLeetCode:      "algorithms,data-structures",
		PlatformCodeforces:    "implementation,greedy",
		PlatformCodeChef:      "ad-hoc,math",
		PlatformAtCoder:       "dynamic-programming,implementation",
		PlatformHackerRank:    "arrays,strings",
		PlatformTopCoder:      "simulation,math",
		PlatformGeeksForGeeks: "arrays,hashing",
		PlatformCoder:         "algorithms,problem-solving",
	}
	solved := stableBucket(platform+":"+rawSlug, 900000) + 1000

	return CatalogEntry{
		Title:         slugToTitle(rawSlug),
		Contest:       contestByPlatform[platform],
		Tags:          tagsByPlatform[platform],
		Difficulty:    defaultDifficulty,
		SolvedByCount: intPtr(solved),
	}
}

func slugToTitle(value string) string {
	replacer := regexp.MustCompile(`[_-]+`)
	cleaned := strings.TrimSpace(replacer.ReplaceAllString(value, " "))
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	if cleaned == "" {
		return "Untitled Problem"
	}
	words := strings.Fields(cleaned)
	for index, word := range words {
		words[index] = strings.ToUpper(word[:1]) + strings.ToLower(word[1:])
	}
	return strings.Join(words, " ")
}

func stableBucket(seed string, mod int) int {
	if mod <= 0 {
		return 0
	}
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(seed))
	return int(hasher.Sum32() % uint32(mod))
}

func key(platform string, problemID string) string {
	return platform + "::" + problemID
}

func pathSegments(path string) []string {
	raw := strings.Split(path, "/")
	parts := make([]string, 0, len(raw))
	for _, item := range raw {
		if strings.TrimSpace(item) == "" {
			continue
		}
		parts = append(parts, item)
	}
	return parts
}

func intPtr(value int) *int {
	return &value
}

func stringPtr(value string) *string {
	return &value
}

func stringPtrIf(ok bool, value string) *string {
	if !ok {
		return nil
	}
	return &value
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func derefDefault(value *string, fallback string) string {
	if value == nil || *value == "" {
		return fallback
	}
	return *value
}

func ParseNullableInt(value any) *int {
	switch typed := value.(type) {
	case int:
		return &typed
	case int64:
		converted := int(typed)
		return &converted
	case string:
		if typed == "" {
			return nil
		}
		parsed, err := strconv.Atoi(typed)
		if err != nil {
			return nil
		}
		return &parsed
	default:
		return nil
	}
}
