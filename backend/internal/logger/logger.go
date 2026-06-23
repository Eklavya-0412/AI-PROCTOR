package logger

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
)

type Config struct {
	LogFilePath string
	UseJSON     bool 
	Level       slog.Level
}

func New(cfg Config) (*slog.Logger, *os.File, error) {
	logDir := filepath.Dir(cfg.LogFilePath)
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, nil, fmt.Errorf("failed to create log directory %s: %w", logDir, err)
	}

	file, err := os.OpenFile(cfg.LogFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open log file at %s: %w", cfg.LogFilePath, err)
	}

	multiWriter := io.MultiWriter(os.Stdout, file)

	opts := &slog.HandlerOptions{
		Level: cfg.Level,
	}

	var handler slog.Handler
	if cfg.UseJSON {
		handler = slog.NewJSONHandler(multiWriter, opts)
	} else {
		handler = slog.NewTextHandler(multiWriter, opts)
	}
	return slog.New(handler), file, nil
}