package migrations

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"algosphere/backend/internal/config"
	"algosphere/backend/internal/model"
)

func TestEnsureCurrentDoesNotCreateTrackingTableFromAlembicState(t *testing.T) {
	db := openTestDB(t)

	if err := db.Exec("CREATE TABLE alembic_version (version_num TEXT NOT NULL)").Error; err != nil {
		t.Fatalf("create alembic_version: %v", err)
	}
	if err := db.Exec("INSERT INTO alembic_version (version_num) VALUES (?)", LatestVersion()).Error; err != nil {
		t.Fatalf("seed alembic_version: %v", err)
	}

	if err := EnsureCurrent(context.Background(), db, config.Settings{}); err != nil {
		t.Fatalf("EnsureCurrent returned error: %v", err)
	}
	if db.Migrator().HasTable(&model.SchemaMigration{}) {
		t.Fatal("EnsureCurrent should not create schema_migrations during read-only startup checks")
	}
}

func TestEnsureCurrentRejectsEmptyDatabase(t *testing.T) {
	db := openTestDB(t)

	err := EnsureCurrent(context.Background(), db, config.Settings{})
	if err == nil {
		t.Fatal("EnsureCurrent returned nil for an uninitialized database")
	}
	if !strings.Contains(err.Error(), "run `algosphere migrate up`") {
		t.Fatalf("EnsureCurrent error %q did not include migration guidance", err)
	}
}

func TestRunUpAdoptsAlembicState(t *testing.T) {
	db := openTestDB(t)

	if err := db.Exec("CREATE TABLE alembic_version (version_num TEXT NOT NULL)").Error; err != nil {
		t.Fatalf("create alembic_version: %v", err)
	}
	if err := db.Exec("INSERT INTO alembic_version (version_num) VALUES (?)", LatestVersion()).Error; err != nil {
		t.Fatalf("seed alembic_version: %v", err)
	}

	if err := RunUp(context.Background(), db); err != nil {
		t.Fatalf("RunUp returned error: %v", err)
	}

	if !db.Migrator().HasTable(&model.SchemaMigration{}) {
		t.Fatal("RunUp should create schema_migrations when migrations are applied explicitly")
	}

	current, err := currentVersion(db)
	if err != nil {
		t.Fatalf("currentVersion returned error: %v", err)
	}
	if current != LatestVersion() {
		t.Fatalf("currentVersion = %q, want %q", current, LatestVersion())
	}
}

func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.NewReplacer("/", "_", " ", "_").Replace(t.Name()))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	return db
}
