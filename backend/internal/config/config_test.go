package config

import "testing"

func TestProductionSettingsRequireNonDefaultSecretKey(t *testing.T) {
	t.Setenv("ALGOSPHERE_ENVIRONMENT", "production")
	t.Setenv("ALGOSPHERE_DATABASE_URL", "mysql+pymysql://user:pass@db:3306/algosphere")
	t.Setenv("ALGOSPHERE_SEED_DEMO_DATA", "false")
	t.Setenv("ALGOSPHERE_ENABLE_DOCS", "false")
	t.Setenv("ALGOSPHERE_DATABASE_AUTO_MIGRATE", "false")
	t.Setenv("ALGOSPHERE_SECRET_KEY", DefaultSecretKey)

	if _, err := Load(); err == nil {
		t.Fatalf("expected production config validation to fail for default secret key")
	}
}

func TestProductionSettingsRejectAutoMigrate(t *testing.T) {
	t.Setenv("ALGOSPHERE_ENVIRONMENT", "production")
	t.Setenv("ALGOSPHERE_DATABASE_URL", "mysql+pymysql://user:pass@db:3306/algosphere")
	t.Setenv("ALGOSPHERE_SEED_DEMO_DATA", "false")
	t.Setenv("ALGOSPHERE_ENABLE_DOCS", "false")
	t.Setenv("ALGOSPHERE_SECRET_KEY", "this-is-a-long-enough-secret-for-production")
	t.Setenv("ALGOSPHERE_DATABASE_AUTO_MIGRATE", "true")

	if _, err := Load(); err == nil {
		t.Fatalf("expected production config validation to fail when auto-migrate is enabled")
	}
}
