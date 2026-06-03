package migrations

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"algosphere/backend/internal/config"
	"algosphere/backend/internal/model"
)

type Step struct {
	ID string
	Up func(tx *gorm.DB) error
}

var steps = []Step{
	{
		ID: "20260314_0001",
		Up: func(tx *gorm.DB) error {
			return tx.AutoMigrate(
				&model.User{},
				&model.Friendship{},
				&model.Group{},
				&model.GroupMembership{},
				&model.ProblemShare{},
			)
		},
	},
	{
		ID: "20260314_0002",
		Up: func(tx *gorm.DB) error {
			if !tx.Migrator().HasColumn(&model.Friendship{}, "status") {
				if err := tx.Migrator().AddColumn(&model.Friendship{}, "Status"); err != nil {
					return err
				}
			}
			return tx.Model(&model.Friendship{}).
				Where("status = ? OR status = ''", "pending").
				Update("status", "accepted").Error
		},
	},
	{
		ID: "20260327_0004",
		Up: func(tx *gorm.DB) error {
			return tx.AutoMigrate(&model.Challenge{}, &model.ChallengeParticipant{}, &model.ChallengeProblem{})
		},
	},
	{
		ID: "20260328_0005",
		Up: func(tx *gorm.DB) error {
			return tx.AutoMigrate(&model.User{})
		},
	},
	{
		ID: "20260328_0006",
		Up: func(tx *gorm.DB) error {
			return tx.AutoMigrate(&model.JoinRequest{})
		},
	},
	{
		ID: "20260603_0007",
		Up: func(tx *gorm.DB) error {
			return tx.AutoMigrate(&model.User{})
		},
	},
}

func LatestVersion() string {
	return steps[len(steps)-1].ID
}

func RunUp(ctx context.Context, db *gorm.DB) error {
	if err := ensureTrackingTable(db); err != nil {
		return err
	}

	applied, err := appliedMigrations(db)
	if err != nil {
		return err
	}

	if len(applied) == 0 {
		if err := adoptAlembicState(db); err != nil {
			return err
		}
		applied, err = appliedMigrations(db)
		if err != nil {
			return err
		}
	}

	for _, step := range steps {
		if _, ok := applied[step.ID]; ok {
			continue
		}

		if err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := step.Up(tx); err != nil {
				return fmt.Errorf("apply migration %s: %w", step.ID, err)
			}
			record := model.SchemaMigration{
				ID:        step.ID,
				Source:    "go",
				AppliedAt: time.Now().UTC(),
			}
			if err := tx.Create(&record).Error; err != nil {
				return fmt.Errorf("record migration %s: %w", step.ID, err)
			}
			return nil
		}); err != nil {
			return err
		}
	}

	return nil
}

func EnsureCurrent(ctx context.Context, db *gorm.DB, settings config.Settings) error {
	if settings.DatabaseAutoMigrate {
		return RunUp(ctx, db)
	}

	current, source, err := currentKnownVersion(db)
	if err != nil {
		return err
	}
	if current == "" {
		return errors.New("database schema is not initialized; run `algosphere migrate up` before starting the API")
	}
	if current != LatestVersion() {
		if source == "" {
			source = "database metadata"
		}
		return fmt.Errorf("database schema is at %s according to %s, expected %s; run `algosphere migrate up` before starting the API", current, source, LatestVersion())
	}
	return nil
}

func currentKnownVersion(db *gorm.DB) (string, string, error) {
	if db.Migrator().HasTable(&model.SchemaMigration{}) {
		current, err := currentVersion(db)
		if err != nil {
			return "", "", err
		}
		if current != "" {
			return current, "schema_migrations", nil
		}
	}

	current, err := currentAlembicVersion(db)
	if err != nil {
		return "", "", err
	}
	if current != "" {
		return current, "alembic_version", nil
	}

	return "", "", nil
}

func ensureTrackingTable(db *gorm.DB) error {
	return db.AutoMigrate(&model.SchemaMigration{})
}

func appliedMigrations(db *gorm.DB) (map[string]struct{}, error) {
	records := make([]model.SchemaMigration, 0)
	if err := db.Order("id asc").Find(&records).Error; err != nil {
		return nil, fmt.Errorf("list applied migrations: %w", err)
	}
	result := make(map[string]struct{}, len(records))
	for _, record := range records {
		result[record.ID] = struct{}{}
	}
	return result, nil
}

func currentVersion(db *gorm.DB) (string, error) {
	var record model.SchemaMigration
	err := db.Order("id desc").Take(&record).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get current migration version: %w", err)
	}
	return record.ID, nil
}

func adoptAlembicState(db *gorm.DB) error {
	var count int64
	if err := db.Model(&model.SchemaMigration{}).Count(&count).Error; err != nil {
		return fmt.Errorf("count tracked migrations: %w", err)
	}
	if count > 0 {
		return nil
	}

	version, err := currentAlembicVersion(db)
	if err != nil {
		return err
	}
	if version == "" {
		return nil
	}

	index := -1
	for i, step := range steps {
		if step.ID == version {
			index = i
			break
		}
	}
	if index == -1 {
		return fmt.Errorf("unsupported alembic version %q; expected one of the known AlgoSphere revisions", version)
	}

	for i := 0; i <= index; i++ {
		record := model.SchemaMigration{
			ID:        steps[i].ID,
			Source:    "alembic",
			AppliedAt: time.Now().UTC(),
		}
		if err := db.Create(&record).Error; err != nil {
			return fmt.Errorf("adopt alembic version %s: %w", steps[i].ID, err)
		}
	}
	return nil
}

func currentAlembicVersion(db *gorm.DB) (string, error) {
	if !db.Migrator().HasTable("alembic_version") {
		return "", nil
	}

	type alembicRow struct {
		Version string `gorm:"column:version_num"`
	}

	var row alembicRow
	if err := db.Table("alembic_version").Select("version_num").Limit(1).Take(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", fmt.Errorf("read alembic version: %w", err)
	}

	return strings.TrimSpace(row.Version), nil
}
