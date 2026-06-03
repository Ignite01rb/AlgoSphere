package ratelimit

import (
	"sync"
	"time"
)

type Decision struct {
	Allowed           bool
	RetryAfterSeconds int
}

type entry struct {
	count   int
	resetAt time.Time
}

type FixedWindowLimiter struct {
	maxAttempts int
	window      time.Duration
	now         func() time.Time
	mu          sync.Mutex
	entries     map[string]entry
}

func NewFixedWindowLimiter(maxAttempts int, windowSeconds int, now func() time.Time) *FixedWindowLimiter {
	if now == nil {
		now = func() time.Time {
			return time.Now().UTC()
		}
	}
	return &FixedWindowLimiter{
		maxAttempts: maxAttempts,
		window:      time.Duration(windowSeconds) * time.Second,
		now:         now,
		entries:     make(map[string]entry),
	}
}

func (l *FixedWindowLimiter) Check(key string) Decision {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	current, ok := l.currentEntryLocked(key, now)
	if !ok || current.count < l.maxAttempts {
		return Decision{Allowed: true}
	}

	retryAfter := int(current.resetAt.Sub(now).Seconds())
	if retryAfter < 1 {
		retryAfter = 1
	}
	return Decision{
		Allowed:           false,
		RetryAfterSeconds: retryAfter,
	}
}

func (l *FixedWindowLimiter) RecordFailure(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	current, ok := l.currentEntryLocked(key, now)
	if !ok {
		current = entry{resetAt: now.Add(l.window)}
	}
	current.count++
	l.entries[key] = current
}

func (l *FixedWindowLimiter) RecordAttempt(key string) {
	l.RecordFailure(key)
}

func (l *FixedWindowLimiter) Clear(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, key)
}

func (l *FixedWindowLimiter) currentEntryLocked(key string, now time.Time) (entry, bool) {
	current, ok := l.entries[key]
	if !ok {
		return entry{}, false
	}
	if !current.resetAt.After(now) {
		delete(l.entries, key)
		return entry{}, false
	}
	return current, true
}
