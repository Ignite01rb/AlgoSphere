package startup

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"algosphere/backend/internal/config"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/search"
)

func Run(ctx context.Context, db *gorm.DB, settings config.Settings, index *search.Index) error {
	if settings.SeedDemoData {
		if err := SeedDatabase(ctx, db); err != nil {
			return err
		}
	}

	var usernames []string
	if err := db.WithContext(ctx).Model(&model.User{}).Order("username asc").Pluck("username", &usernames).Error; err != nil {
		return fmt.Errorf("load usernames for search index: %w", err)
	}
	index.LoadUsernames(usernames)

	var problemTitles []string
	if err := db.WithContext(ctx).Model(&model.ProblemShare{}).Distinct("title").Order("title asc").Pluck("title", &problemTitles).Error; err != nil {
		return fmt.Errorf("load problem titles for search index: %w", err)
	}
	index.LoadProblemTitles(problemTitles)
	return nil
}
