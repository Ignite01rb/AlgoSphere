package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	DefaultSecretKey = "change-this-secret-key-before-production-please"
	localhostA       = "localhost"
	localhostB       = "127.0.0.1"
)

type Settings struct {
	AppName                         string
	Environment                     string
	DatabaseURL                     string
	DatabaseAutoMigrate             bool
	DatabasePoolSize                int
	DatabaseMaxOverflow             int
	DatabasePoolRecycleSeconds      int
	DatabaseSSLCAPath               string
	DatabaseSSLVerifyCert           bool
	DatabaseSSLVerifyIdentity       bool
	SecretKey                       string
	Algorithm                       string
	TokenIssuer                     string
	AccessTokenExpireMinutes        int
	EnableDocs                      bool
	CORSOrigins                     []string
	AllowedHosts                    []string
	SeedDemoData                    bool
	RunStartupTasksOnAppStart       bool
	AuthRateLimitMaxAttempts        int
	AuthRateLimitWindowSeconds      int
	FriendLookupRateLimitMaxAttempt int
	FriendLookupRateLimitWindowSec  int
	EnableAdmin                     bool
	AdminEmails                     []string
	AdminRateLimitMaxAttempts       int
	AdminRateLimitWindowSeconds     int
	GoogleClientID                  string
	GoogleClientSecret              string
	GoogleRedirectURI               string
	ForwardedAllowIPs               string
	SessionCookieName               string
	Port                            string
}

func Load() (Settings, error) {
	loadDotEnv()
	settings := Settings{
		AppName:                         getEnv("ALGOSPHERE_APP_NAME", "AlgoSphere API"),
		Environment:                     getEnv("ALGOSPHERE_ENVIRONMENT", "development"),
		DatabaseURL:                     getEnv("ALGOSPHERE_DATABASE_URL", "sqlite:///./algosphere.db"),
		DatabasePoolSize:                getEnvInt("ALGOSPHERE_DATABASE_POOL_SIZE", 10),
		DatabaseMaxOverflow:             getEnvInt("ALGOSPHERE_DATABASE_MAX_OVERFLOW", 20),
		DatabasePoolRecycleSeconds:      getEnvInt("ALGOSPHERE_DATABASE_POOL_RECYCLE_SECONDS", 1800),
		DatabaseSSLCAPath:               strings.TrimSpace(os.Getenv("ALGOSPHERE_DATABASE_SSL_CA_PATH")),
		DatabaseSSLVerifyCert:           getEnvBool("ALGOSPHERE_DATABASE_SSL_VERIFY_CERT", false),
		DatabaseSSLVerifyIdentity:       getEnvBool("ALGOSPHERE_DATABASE_SSL_VERIFY_IDENTITY", false),
		DatabaseAutoMigrate:             getEnvBool("ALGOSPHERE_DATABASE_AUTO_MIGRATE", false),
		SecretKey:                       getEnv("ALGOSPHERE_SECRET_KEY", DefaultSecretKey),
		Algorithm:                       getEnv("ALGOSPHERE_ALGORITHM", "HS256"),
		TokenIssuer:                     getEnv("ALGOSPHERE_TOKEN_ISSUER", "algosphere-api"),
		AccessTokenExpireMinutes:        getEnvInt("ALGOSPHERE_ACCESS_TOKEN_EXPIRE_MINUTES", 1440),
		EnableDocs:                      getEnvBool("ALGOSPHERE_ENABLE_DOCS", true),
		CORSOrigins:                     splitCSV(getEnv("ALGOSPHERE_CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080")),
		AllowedHosts:                    splitCSV(getEnv("ALGOSPHERE_ALLOWED_HOSTS", "localhost,127.0.0.1,algosphere.local")),
		SeedDemoData:                    getEnvBool("ALGOSPHERE_SEED_DEMO_DATA", true),
		RunStartupTasksOnAppStart:       getEnvBool("ALGOSPHERE_RUN_STARTUP_TASKS_ON_APP_START", true),
		AuthRateLimitMaxAttempts:        getEnvInt("ALGOSPHERE_AUTH_RATE_LIMIT_MAX_ATTEMPTS", 5),
		AuthRateLimitWindowSeconds:      getEnvInt("ALGOSPHERE_AUTH_RATE_LIMIT_WINDOW_SECONDS", 300),
		FriendLookupRateLimitMaxAttempt: getEnvInt("ALGOSPHERE_FRIEND_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS", 20),
		FriendLookupRateLimitWindowSec:  getEnvInt("ALGOSPHERE_FRIEND_LOOKUP_RATE_LIMIT_WINDOW_SECONDS", 60),
		EnableAdmin:                     getEnvBool("ALGOSPHERE_ENABLE_ADMIN", false),
		AdminEmails:                     normalizeEmails(splitCSV(os.Getenv("ALGOSPHERE_ADMIN_EMAILS"))),
		AdminRateLimitMaxAttempts:       getEnvInt("ALGOSPHERE_ADMIN_RATE_LIMIT_MAX_ATTEMPTS", 5),
		AdminRateLimitWindowSeconds:     getEnvInt("ALGOSPHERE_ADMIN_RATE_LIMIT_WINDOW_SECONDS", 300),
		GoogleClientID:                  strings.TrimSpace(os.Getenv("ALGOSPHERE_GOOGLE_CLIENT_ID")),
		GoogleClientSecret:              strings.TrimSpace(os.Getenv("ALGOSPHERE_GOOGLE_CLIENT_SECRET")),
		GoogleRedirectURI:               getEnv("ALGOSPHERE_GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/google/callback"),
		ForwardedAllowIPs:               strings.TrimSpace(os.Getenv("ALGOSPHERE_FORWARDED_ALLOW_IPS")),
		SessionCookieName:               getEnv("ALGOSPHERE_SESSION_COOKIE_NAME", "algosphere-admin-session"),
		Port:                            getEnv("PORT", "8000"),
	}

	if err := settings.validate(); err != nil {
		return Settings{}, err
	}

	return settings, nil
}

func (s Settings) validate() error {
	switch s.Environment {
	case "development", "production", "test":
	default:
		return fmt.Errorf("ALGOSPHERE_ENVIRONMENT must be one of development, production, or test")
	}

	if s.AccessTokenExpireMinutes <= 0 {
		return errors.New("ALGOSPHERE_ACCESS_TOKEN_EXPIRE_MINUTES must be greater than zero")
	}

	if s.Environment != "production" {
		return nil
	}

	if s.SecretKey == DefaultSecretKey {
		return errors.New("ALGOSPHERE_SECRET_KEY must be set to a non-default value in production")
	}
	if len(s.SecretKey) < 32 {
		return errors.New("ALGOSPHERE_SECRET_KEY must be at least 32 characters long in production")
	}
	if strings.HasPrefix(s.DatabaseURL, "sqlite") {
		return errors.New("production deployments must use MySQL-compatible storage, not SQLite")
	}
	if s.DatabaseAutoMigrate {
		return errors.New("ALGOSPHERE_DATABASE_AUTO_MIGRATE must be false in production; run `algosphere migrate up` separately")
	}
	if s.SeedDemoData {
		return errors.New("ALGOSPHERE_SEED_DEMO_DATA must be false in production")
	}
	if s.EnableDocs {
		return errors.New("ALGOSPHERE_ENABLE_DOCS must be false in production")
	}
	for _, origin := range s.CORSOrigins {
		if origin == "*" {
			return errors.New("production CORS origins must not contain wildcards")
		}
		if strings.HasPrefix(origin, "http://") && !strings.Contains(origin, localhostA) && !strings.Contains(origin, localhostB) {
			return errors.New("production CORS origins must use HTTPS unless they target localhost")
		}
	}
	for _, host := range s.AllowedHosts {
		if host == "*" {
			return errors.New("production allowed hosts must not contain wildcards")
		}
	}
	if s.EnableAdmin && len(s.AdminEmails) == 0 {
		return errors.New("ALGOSPHERE_ADMIN_EMAILS must be set when ALGOSPHERE_ENABLE_ADMIN=true")
	}
	return nil
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func getEnvBool(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	switch strings.ToLower(raw) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func getEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func splitCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}

	seen := make(map[string]struct{})
	values := make([]string, 0)
	for _, part := range strings.Split(raw, ",") {
		cleaned := strings.TrimSpace(part)
		if cleaned == "" {
			continue
		}
		if _, ok := seen[cleaned]; ok {
			continue
		}
		seen[cleaned] = struct{}{}
		values = append(values, cleaned)
	}
	return values
}

func normalizeEmails(values []string) []string {
	seen := make(map[string]struct{})
	result := make([]string, 0, len(values))
	for _, value := range values {
		cleaned := strings.ToLower(strings.TrimSpace(value))
		if cleaned == "" {
			continue
		}
		if _, ok := seen[cleaned]; ok {
			continue
		}
		seen[cleaned] = struct{}{}
		result = append(result, cleaned)
	}
	return result
}

func loadDotEnv() {
	paths := []string{".env", "backend/.env"}
	for _, path := range paths {
		content, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if (strings.HasPrefix(value, "\"") && strings.HasSuffix(value, "\"")) ||
				(strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'")) {
				value = value[1 : len(value)-1]
			}
			if os.Getenv(key) == "" {
				os.Setenv(key, value)
			}
		}
	}
}
