package app

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"algosphere/backend/internal/config"
	"algosphere/backend/internal/database"
	"algosphere/backend/internal/httpapi"
	"algosphere/backend/internal/migrations"
	"algosphere/backend/internal/ratelimit"
	"algosphere/backend/internal/search"
	"algosphere/backend/internal/startup"
)

func RunMigrations(ctx context.Context, logger *slog.Logger, settings config.Settings) error {
	db, _, err := database.Open(ctx, settings)
	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err == nil {
		defer sqlDB.Close()
	}

	if err := migrations.RunUp(ctx, db); err != nil {
		return err
	}

	logger.Info("database migrations applied", "version", migrations.LatestVersion())
	return nil
}

func RunServer(ctx context.Context, logger *slog.Logger, settings config.Settings) error {
	db, _, err := database.Open(ctx, settings)
	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err == nil {
		defer sqlDB.Close()
	}

	if err := migrations.EnsureCurrent(ctx, db, settings); err != nil {
		return err
	}

	indices := search.NewIndex()
	if settings.RunStartupTasksOnAppStart {
		if err := startup.Run(ctx, db, settings, indices); err != nil {
			return err
		}
	} else {
		logger.Info("startup tasks disabled; search indices will remain cold until the service is restarted with ALGOSPHERE_RUN_STARTUP_TASKS_ON_APP_START=true")
	}

	router := httpapi.NewRouter(httpapi.Dependencies{
		Settings:            settings,
		DB:                  db,
		SearchIndex:         indices,
		AuthLimiter:         ratelimit.NewFixedWindowLimiter(settings.AuthRateLimitMaxAttempts, settings.AuthRateLimitWindowSeconds, nil),
		FriendLookupLimiter: ratelimit.NewFixedWindowLimiter(settings.FriendLookupRateLimitMaxAttempt, settings.FriendLookupRateLimitWindowSec, nil),
		AdminLimiter:        ratelimit.NewFixedWindowLimiter(settings.AdminRateLimitMaxAttempts, settings.AdminRateLimitWindowSeconds, nil),
		Logger:              logger,
	})

	server := &http.Server{
		Addr:              fmt.Sprintf(":%s", settings.Port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("starting http server", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown server: %w", err)
		}
		return nil
	case err := <-errCh:
		return err
	}
}
