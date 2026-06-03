package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"algosphere/backend/internal/app"
	"algosphere/backend/internal/config"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	settings, err := config.Load()
	if err != nil {
		logger.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	switch command {
	case "serve":
		if err := app.RunServer(ctx, logger, settings); err != nil {
			logger.Error("server stopped with error", "error", err)
			os.Exit(1)
		}
	case "migrate":
		subcommand := "up"
		if len(os.Args) > 2 {
			subcommand = os.Args[2]
		}
		if subcommand != "up" {
			logger.Error("unsupported migration subcommand", "command", subcommand)
			os.Exit(1)
		}
		if err := app.RunMigrations(ctx, logger, settings); err != nil {
			logger.Error("migration failed", "error", err)
			os.Exit(1)
		}
	case "version":
		fmt.Println(settings.AppName)
	default:
		logger.Error("unsupported command", "command", command)
		os.Exit(1)
	}
}
