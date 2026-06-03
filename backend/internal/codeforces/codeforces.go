package codeforces

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	apiURL     = "https://codeforces.com/api/problemset.problems"
	problemURL = "https://codeforces.com/problemset/problem/%d/%s"
)

type Problem struct {
	ContestID int
	Index     string
	Name      string
	Rating    *int
	Tags      []string
}

func (p Problem) URL() string {
	return fmt.Sprintf(problemURL, p.ContestID, p.Index)
}

type apiResponse struct {
	Status string `json:"status"`
	Result struct {
		Problems []struct {
			ContestID int      `json:"contestId"`
			Index     string   `json:"index"`
			Name      string   `json:"name"`
			Rating    *int     `json:"rating"`
			Tags      []string `json:"tags"`
		} `json:"problems"`
	} `json:"result"`
	Comment string `json:"comment"`
}

func FetchProblems(ctx context.Context, tags []string, minRating *int, maxRating *int) ([]Problem, error) {
	reqURL, err := url.Parse(apiURL)
	if err != nil {
		return nil, err
	}
	if len(tags) > 0 {
		query := reqURL.Query()
		query.Set("tags", strings.Join(tags, ";"))
		reqURL.RawQuery = query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL.String(), nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("codeforces API returned status %d", resp.StatusCode)
	}

	var payload apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Status != "OK" {
		if payload.Comment == "" {
			payload.Comment = "unknown error"
		}
		return nil, fmt.Errorf("codeforces API error: %s", payload.Comment)
	}

	problems := make([]Problem, 0, len(payload.Result.Problems))
	for _, raw := range payload.Result.Problems {
		if raw.Rating == nil {
			continue
		}
		if minRating != nil && *raw.Rating < *minRating {
			continue
		}
		if maxRating != nil && *raw.Rating > *maxRating {
			continue
		}
		problems = append(problems, Problem{
			ContestID: raw.ContestID,
			Index:     raw.Index,
			Name:      raw.Name,
			Rating:    raw.Rating,
			Tags:      raw.Tags,
		})
	}
	return problems, nil
}

func PickRandomProblems(problems []Problem, count int) []Problem {
	if len(problems) <= count {
		return append([]Problem(nil), problems...)
	}
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	shuffled := append([]Problem(nil), problems...)
	rng.Shuffle(len(shuffled), func(i int, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})
	return shuffled[:count]
}
