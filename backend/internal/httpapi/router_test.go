package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"algosphere/backend/internal/config"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/ratelimit"
	"algosphere/backend/internal/search"
	"algosphere/backend/internal/security"
)

func TestLoginRateLimitingAndSecurityHeaders(t *testing.T) {
	db := newTestDB(t)
	passwordHash, err := security.HashPassword("AlgoSphere!123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := model.User{
		Email:        "alex@example.com",
		Username:     "alex",
		DisplayName:  "Alex Rivera",
		Bio:          "",
		PasswordHash: &passwordHash,
		AuthProvider: "local",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}

	router := newTestRouter(t, db, testSettings(), search.NewIndex(), ratelimit.NewFixedWindowLimiter(2, 300, nil), ratelimit.NewFixedWindowLimiter(20, 60, nil), ratelimit.NewFixedWindowLimiter(5, 300, nil))
	server := httptest.NewServer(router)
	defer server.Close()

	body := map[string]string{"identifier": "alex", "password": "wrong-password"}
	for i := 0; i < 2; i++ {
		response := postJSON(t, server.URL+"/api/auth/login", body)
		if response.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", response.StatusCode)
		}
		if got := response.Header.Get("Cache-Control"); got != "no-store" {
			t.Fatalf("expected no-store cache header, got %q", got)
		}
		if got := response.Header.Get("Content-Security-Policy"); got == "" {
			t.Fatalf("expected content-security-policy header")
		}
		if got := response.Header.Get("X-Content-Type-Options"); got != "nosniff" {
			t.Fatalf("expected nosniff header, got %q", got)
		}
		_ = response.Body.Close()
	}

	blocked := postJSON(t, server.URL+"/api/auth/login", body)
	defer blocked.Body.Close()
	if blocked.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", blocked.StatusCode)
	}
	if blocked.Header.Get("Retry-After") == "" {
		t.Fatalf("expected Retry-After header")
	}
}

func TestFriendLookupNormalizesAtPrefix(t *testing.T) {
	db := newTestDB(t)
	passwordHash, err := security.HashPassword("AlgoSphere!123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	users := []model.User{
		{Email: "alex@example.com", Username: "alex", DisplayName: "Alex Rivera", Bio: "", PasswordHash: &passwordHash, AuthProvider: "local"},
		{Email: "bob@example.com", Username: "bob_smith", DisplayName: "Bob Smith", Bio: "", PasswordHash: &passwordHash, AuthProvider: "local"},
		{Email: "casey@example.com", Username: "casey", DisplayName: "Casey Jones", Bio: "", PasswordHash: &passwordHash, AuthProvider: "local"},
	}
	for index := range users {
		if err := db.Create(&users[index]).Error; err != nil {
			t.Fatalf("seed user: %v", err)
		}
	}
	pending := model.Friendship{UserID: users[0].ID, FriendID: users[2].ID, Status: "pending"}
	if err := db.Create(&pending).Error; err != nil {
		t.Fatalf("seed friendship: %v", err)
	}

	index := search.NewIndex()
	index.LoadUsernames([]string{"alex", "bob_smith", "casey"})
	router := newTestRouter(t, db, testSettings(), index, ratelimit.NewFixedWindowLimiter(5, 300, nil), ratelimit.NewFixedWindowLimiter(10, 300, nil), ratelimit.NewFixedWindowLimiter(5, 300, nil))
	server := httptest.NewServer(router)
	defer server.Close()

	token, err := security.CreateAccessToken(testSettings(), toString(users[0].ID))
	if err != nil {
		t.Fatalf("create token: %v", err)
	}
	request, err := http.NewRequest(http.MethodGet, server.URL+"/api/friends/lookup?username=%20@Bob_Smith%20", nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	request.Header.Set("Authorization", "Bearer "+token)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", response.StatusCode)
	}

	var payload struct {
		User friendUser `json:"user"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.User.Username != "bob_smith" {
		t.Fatalf("expected bob_smith, got %#v", payload.User)
	}
}

func TestAdminLoginUsesEmailField(t *testing.T) {
	db := newTestDB(t)
	settings := testSettings()
	settings.EnableAdmin = true
	settings.AdminEmails = []string{"admin@example.com"}

	passwordHash, err := security.HashPassword("AlgoSphere!123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := model.User{
		Email:        "admin@example.com",
		Username:     "admin",
		DisplayName:  "Asish Kumar",
		Bio:          "",
		PasswordHash: &passwordHash,
		AuthProvider: "local",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("seed admin: %v", err)
	}

	router := newTestRouter(t, db, settings, search.NewIndex(), ratelimit.NewFixedWindowLimiter(5, 300, nil), ratelimit.NewFixedWindowLimiter(20, 60, nil), ratelimit.NewFixedWindowLimiter(2, 300, nil))
	server := httptest.NewServer(router)
	defer server.Close()

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	client := &http.Client{Jar: jar, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	}}

	loginPage, err := client.Get(server.URL + "/admin/login")
	if err != nil {
		t.Fatalf("get login page: %v", err)
	}
	loginPageBody, _ := io.ReadAll(loginPage.Body)
	_ = loginPage.Body.Close()
	bodyText := string(loginPageBody)
	if !strings.Contains(bodyText, "Email") || strings.Contains(bodyText, "Username") {
		t.Fatalf("expected login page to use email field, got %s", bodyText)
	}

	form := strings.NewReader("email=admin%40example.com&password=AlgoSphere%21123")
	request, err := http.NewRequest(http.MethodPost, server.URL+"/admin/login", form)
	if err != nil {
		t.Fatalf("new login request: %v", err)
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := client.Do(request)
	if err != nil {
		t.Fatalf("post login: %v", err)
	}
	_ = response.Body.Close()
	if response.StatusCode != http.StatusFound {
		t.Fatalf("expected redirect after login, got %d", response.StatusCode)
	}
	if got := response.Header.Get("Location"); !strings.HasSuffix(got, "/admin/") {
		t.Fatalf("expected redirect to /admin/, got %q", got)
	}

	adminHome, err := client.Get(server.URL + "/admin/")
	if err != nil {
		t.Fatalf("get admin home: %v", err)
	}
	defer adminHome.Body.Close()
	if adminHome.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for admin home, got %d", adminHome.StatusCode)
	}
}

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.NewReplacer("/", "_", " ", "_").Replace(t.Name()))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		t.Fatalf("enable foreign keys: %v", err)
	}
	if err := db.AutoMigrate(
		&model.User{},
		&model.Friendship{},
		&model.Group{},
		&model.GroupMembership{},
		&model.ProblemShare{},
		&model.JoinRequest{},
		&model.Challenge{},
		&model.ChallengeParticipant{},
		&model.ChallengeProblem{},
	); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	return db
}

func newTestRouter(t *testing.T, db *gorm.DB, settings config.Settings, index *search.Index, authLimiter *ratelimit.FixedWindowLimiter, friendLimiter *ratelimit.FixedWindowLimiter, adminLimiter *ratelimit.FixedWindowLimiter) http.Handler {
	t.Helper()
	return NewRouter(Dependencies{
		Settings:            settings,
		DB:                  db,
		SearchIndex:         index,
		AuthLimiter:         authLimiter,
		FriendLookupLimiter: friendLimiter,
		AdminLimiter:        adminLimiter,
		Logger:              slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
}

func testSettings() config.Settings {
	return config.Settings{
		AppName:                         "AlgoSphere API",
		Environment:                     "test",
		DatabaseURL:                     "sqlite:///./test.db",
		DatabasePoolSize:                5,
		DatabaseMaxOverflow:             5,
		DatabasePoolRecycleSeconds:      300,
		SecretKey:                       "this-is-a-long-enough-secret-for-production",
		Algorithm:                       "HS256",
		TokenIssuer:                     "algosphere-api",
		AccessTokenExpireMinutes:        60,
		EnableDocs:                      false,
		CORSOrigins:                     []string{"http://localhost:8080"},
		AllowedHosts:                    []string{"127.0.0.1", "localhost"},
		SeedDemoData:                    false,
		RunStartupTasksOnAppStart:       false,
		AuthRateLimitMaxAttempts:        5,
		AuthRateLimitWindowSeconds:      300,
		FriendLookupRateLimitMaxAttempt: 20,
		FriendLookupRateLimitWindowSec:  60,
		EnableAdmin:                     false,
		AdminRateLimitMaxAttempts:       5,
		AdminRateLimitWindowSeconds:     300,
		SessionCookieName:               "algosphere-admin-session",
		Port:                            "8000",
	}
}

func postJSON(t *testing.T, rawURL string, payload any) *http.Response {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	response, err := http.Post(rawURL, "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("post json: %v", err)
	}
	return response
}

func toString(value uint64) string {
	return strconv.FormatUint(value, 10)
}
