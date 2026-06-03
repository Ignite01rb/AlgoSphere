package ratelimit

import (
	"testing"
	"time"
)

func TestRateLimiterBlocksAndResets(t *testing.T) {
	current := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)
	limiter := NewFixedWindowLimiter(2, 60, func() time.Time { return current })

	if !limiter.Check("login:alex").Allowed {
		t.Fatalf("expected initial request to be allowed")
	}

	limiter.RecordFailure("login:alex")
	limiter.RecordFailure("login:alex")

	decision := limiter.Check("login:alex")
	if decision.Allowed {
		t.Fatalf("expected limiter to block after max attempts")
	}

	current = current.Add(61 * time.Second)
	if !limiter.Check("login:alex").Allowed {
		t.Fatalf("expected limiter to reset after the window")
	}
}
