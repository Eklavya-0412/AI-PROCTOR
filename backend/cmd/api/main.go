package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"proctor/internal/models"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/go-playground/form/v4"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type application struct {
	logger         *slog.Logger
	users          *models.UserModel
	formDecoder    *form.Decoder
	sessionManager *scs.SessionManager
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Print("Warning: No .env file found, relying on system environment variables")
	}
	addr := os.Getenv("APP_ADDR")
	if addr == "" {
		addr = ":4000"
	}
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("FATAL: MONGODB_URI environment variable is not set")
	}
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	client, err := openMongoDB(mongoURI)
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}
	defer client.Disconnect(context.Background())

	formDecoder := form.NewDecoder()
	sessionManager := scs.New()
	sessionManager.Lifetime = 12 * time.Hour
	sessionManager.Cookie.Secure = true

	app := &application{
		logger:         logger,
		users:          models.NewUserModel(client),
		formDecoder:    formDecoder,
		sessionManager: sessionManager,
	}
	tlsConfig := &tls.Config{
		CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP256},
	}
	srv := &http.Server{
		Addr:         addr,
		Handler:      app.routes(),
		ErrorLog:     slog.NewLogLogger(logger.Handler(), slog.LevelError),
		TLSConfig:    tlsConfig,
		IdleTimeout:  time.Minute,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	logger.Info("starting server", "addr", srv.Addr)

	err = srv.ListenAndServeTLS("./tls/cert.pem", "./tls/key.pem")
	logger.Error(err.Error())
	os.Exit(1)
}

func openMongoDB(uri string) (*mongo.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	const maxAttempts = 10
	var pingErr error
	for i := 0; i < maxAttempts; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		pingErr = client.Ping(ctx, nil)
		cancel()
		if pingErr == nil {
			return client, nil
		}
		time.Sleep(time.Duration(i+1) * time.Second)
	}
	client.Disconnect(context.Background())
	return nil, fmt.Errorf("database ping failed after %d attempts: %w", maxAttempts, pingErr)
}