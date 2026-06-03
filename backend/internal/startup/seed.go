package startup

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"algosphere/backend/internal/metadata"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/security"
)

func SeedDatabase(ctx context.Context, db *gorm.DB) error {
	var userCount int64
	if err := db.WithContext(ctx).Model(&model.User{}).Count(&userCount).Error; err != nil {
		return fmt.Errorf("count users before seeding: %w", err)
	}
	if userCount > 0 {
		return nil
	}

	passwordHash, err := security.HashPassword("AlgoSphere!123")
	if err != nil {
		return fmt.Errorf("hash seed password: %w", err)
	}

	now := time.Now().UTC()
	seedUsers := []struct {
		Username         string
		DisplayName      string
		Bio              string
		FavoriteTopic    *string
		FavoritePlatform *string
	}{
		{"alex", "Alex Rivera", "Obsessed with contest prep and clean implementations.", stringPtr("graphs"), stringPtr("Codeforces")},
		{"maya", "Maya Chen", "Patterns, interview prep, and weekly mock rounds.", stringPtr("dynamic programming"), stringPtr("LeetCode")},
		{"joe", "Joe Park", "Prefers tricky math problems and fast submissions.", stringPtr("math"), stringPtr("AtCoder")},
		{"kim", "Kim Reyes", "Greedy proofs, editorial dives, and hard trees.", stringPtr("trees"), stringPtr("Codeforces")},
		{"sam", "Sam Okonkwo", "Grinding arrays, hashes, and interview simulations.", stringPtr("arrays"), stringPtr("LeetCode")},
		{"lee", "Lee Tanaka", "Low-noise builder. Loves implementation-heavy tasks.", stringPtr("implementation"), stringPtr("CodeChef")},
		{"nina", "Nina Volkov", "Weekend contests and graph traversals.", stringPtr("graphs"), stringPtr("AtCoder")},
		{"chris", "Chris Moreau", "Systematic about mediums, ruthless on easy bugs.", stringPtr("strings"), stringPtr("HackerRank")},
		{"pat", "Pat Singh", "Time-boxed practice and accuracy tracking.", stringPtr("greedy"), stringPtr("CodeChef")},
		{"dan", "Dan Kowalski", "Focuses on hard interviews and binary-search variants.", stringPtr("binary search"), stringPtr("LeetCode")},
		{"eli", "Eli Torres", "Loves studying official editorials after contests.", stringPtr("dfs"), stringPtr("GeeksForGeeks")},
		{"rue", "Rue Martin", "Alternates between ladders, mocks, and flash practice.", stringPtr("bitmasks"), stringPtr("Coder")},
	}

	users := make(map[string]*model.User, len(seedUsers))
	for _, seedUser := range seedUsers {
		users[seedUser.Username] = &model.User{
			Email:            fmt.Sprintf("%s@example.com", seedUser.Username),
			Username:         seedUser.Username,
			DisplayName:      seedUser.DisplayName,
			Bio:              seedUser.Bio,
			FavoriteTopic:    seedUser.FavoriteTopic,
			FavoritePlatform: seedUser.FavoritePlatform,
			AvatarURL:        stringPtr(fmt.Sprintf("https://api.dicebear.com/9.x/initials/svg?seed=%s", seedUser.DisplayName)),
			PasswordHash:     &passwordHash,
			AuthProvider:     "local",
			CreatedAt:        now,
		}
	}

	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, user := range users {
			if err := tx.Create(user).Error; err != nil {
				return fmt.Errorf("create seed user %s: %w", user.Username, err)
			}
		}

		for _, friendUsername := range []string{"maya", "joe", "sam", "chris", "eli"} {
			alex := users["alex"]
			friend := users[friendUsername]
			friendships := []model.Friendship{
				{UserID: alex.ID, FriendID: friend.ID, Status: "accepted", CreatedAt: now},
				{UserID: friend.ID, FriendID: alex.ID, Status: "accepted", CreatedAt: now},
			}
			for _, friendship := range friendships {
				if err := tx.Create(&friendship).Error; err != nil {
					return fmt.Errorf("create friendship %d->%d: %w", friendship.UserID, friendship.FriendID, err)
				}
			}
		}

		groups := []*model.Group{
			createGroup("Interview Sprint", users["alex"]),
			createGroup("Graphs After Dark", users["alex"]),
			createGroup("Weekend Contest Crew", users["alex"]),
			createGroup("DP Study Hall", users["alex"]),
			createGroup("Implementation Ladder", users["alex"]),
		}
		groupMembers := map[string][]string{
			"Interview Sprint":      {"alex", "maya", "sam", "chris", "pat"},
			"Graphs After Dark":     {"alex", "nina", "eli", "kim"},
			"Weekend Contest Crew":  {"alex", "joe", "lee", "nina", "rue"},
			"DP Study Hall":         {"alex", "maya", "joe", "dan"},
			"Implementation Ladder": {"alex", "kim", "lee", "pat", "rue"},
		}
		for _, group := range groups {
			if err := tx.Create(group).Error; err != nil {
				return fmt.Errorf("create seed group %s: %w", group.Name, err)
			}
			for _, username := range groupMembers[group.Name] {
				role := "member"
				if username == "alex" {
					role = "owner"
				}
				membership := model.GroupMembership{
					GroupID:   group.ID,
					UserID:    users[username].ID,
					Role:      role,
					CreatedAt: now,
				}
				if err := tx.Create(&membership).Error; err != nil {
					return fmt.Errorf("create membership for %s in %s: %w", username, group.Name, err)
				}
			}
		}

		groupByName := make(map[string]*model.Group, len(groups))
		for _, group := range groups {
			groupByName[group.Name] = group
		}

		seededProblems := []struct {
			GroupName string
			Username  string
			Problem   metadata.ResolvedProblem
		}{
			{"Interview Sprint", "alex", demoProblem("https://leetcode.com/problems/two-sum/", metadata.PlatformLeetCode, "two-sum", "Two Sum", "LeetCode Top Interview 150", "arrays,hashing", "Easy", 5938247)},
			{"Interview Sprint", "maya", demoProblem("https://www.hackerrank.com/challenges/ctci-array-left-rotation/problem", metadata.PlatformHackerRank, "ctci-array-left-rotation", "Array Left Rotation", "Cracking the Coding Interview", "arrays,rotation", "Easy", 925441)},
			{"Graphs After Dark", "nina", demoProblem("https://leetcode.com/problems/number-of-islands/", metadata.PlatformLeetCode, "number-of-islands", "Number of Islands", "LeetCode Graph Theory", "graphs,dfs,bfs,matrix", "Medium", 1902478)},
			{"Graphs After Dark", "eli", demoProblem("https://www.geeksforgeeks.org/problems/count-pairs-with-given-sum", metadata.PlatformGeeksForGeeks, "count-pairs-with-given-sum", "Count Pairs With Given Sum", "GeeksForGeeks Practice", "arrays,hashing", "Medium", 158230)},
			{"Weekend Contest Crew", "joe", demoProblem("https://codeforces.com/problemset/problem/4/A", metadata.PlatformCodeforces, "4A", "Watermelon", "Codeforces Beta Round 4", "math,bruteforce", "Easy", 514287)},
			{"Weekend Contest Crew", "lee", demoProblem("https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/FLOW001", metadata.PlatformCodeChef, "FLOW001", "Add Two Numbers", "CodeChef Practice", "implementation,ad-hoc", "Easy", 371104)},
			{"Weekend Contest Crew", "rue", demoProblem("https://coderbyte.com/challenges/sum-of-primes", metadata.PlatformCoder, "sum-of-primes", "Sum of Primes", "Coder Sprint", "math,sieve,number-theory", "Medium", 84210)},
			{"DP Study Hall", "maya", demoProblem("https://atcoder.jp/contests/dp/tasks/dp_a", metadata.PlatformAtCoder, "dp_a", "Frog 1", "Educational DP Contest", "dynamic-programming", "Easy", 241221)},
			{"DP Study Hall", "dan", demoProblem("https://leetcode.com/problems/binary-tree-maximum-path-sum/", metadata.PlatformLeetCode, "binary-tree-maximum-path-sum", "Binary Tree Maximum Path Sum", "LeetCode Trees", "trees,dfs,dynamic-programming", "Hard", 681223)},
			{"Implementation Ladder", "kim", demoProblem("https://codeforces.com/problemset/problem/71/A", metadata.PlatformCodeforces, "71A", "Way Too Long Words", "Codeforces Beta Round 71", "strings,implementation", "Easy", 662904)},
			{"Implementation Ladder", "pat", demoProblem("https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/START01", metadata.PlatformCodeChef, "START01", "Number Mirror", "CodeChef Beginner", "basics,io", "Easy", 294417)},
			{"Implementation Ladder", "alex", demoProblem("https://leetcode.com/problems/lru-cache/", metadata.PlatformLeetCode, "lru-cache", "LRU Cache", "LeetCode System Design", "design,hashing,linked-list", "Medium", 1398421)},
		}
		for index, seeded := range seededProblems {
			sharedAt := now.Add(-time.Duration(index*7) * time.Hour)
			problem := model.ProblemShare{
				GroupID:           groupByName[seeded.GroupName].ID,
				SharedByID:        users[seeded.Username].ID,
				Platform:          seeded.Problem.Platform,
				ProblemURL:        seeded.Problem.ProblemURL,
				PlatformProblemID: seeded.Problem.PlatformProblemID,
				Title:             seeded.Problem.Title,
				Contest:           seeded.Problem.Contest,
				Tags:              seeded.Problem.Tags,
				Difficulty:        seeded.Problem.Difficulty,
				ThumbnailURL:      seeded.Problem.ThumbnailURL,
				SolvedByCount:     seeded.Problem.SolvedByCount,
				ProblemSignature:  seeded.Problem.Signature(),
				SharedAt:          sharedAt,
			}
			if err := tx.Create(&problem).Error; err != nil {
				return fmt.Errorf("create seed problem %s: %w", problem.Title, err)
			}
		}
		return nil
	})
}

func createGroup(name string, owner *model.User) *model.Group {
	return &model.Group{Name: name, OwnerID: owner.ID, CreatedAt: time.Now().UTC()}
}

func demoProblem(url string, platform string, problemID string, title string, contest string, tags string, difficulty string, solvedByCount int) metadata.ResolvedProblem {
	return metadata.ResolvedProblem{
		Platform:          platform,
		ProblemURL:        url,
		PlatformProblemID: &problemID,
		Title:             title,
		Contest:           &contest,
		Tags:              &tags,
		Difficulty:        difficulty,
		SolvedByCount:     &solvedByCount,
	}
}

func stringPtr(value string) *string {
	return &value
}
