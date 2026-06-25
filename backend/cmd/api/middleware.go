package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Custom context key to prevent native collisions
type contextKey string

const userPayloadContextKey = contextKey("userPayload")

// UserPayload maps data extracted straight from the mathematically validated JWT
type UserPayload struct {
	LoginRadiusID string
	Role          string // "student" or "instructor"
}

// 1. Core Platform Security Headers
func commonHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com")
		w.Header().Set("Referrer-Policy", "origin-when-cross-origin")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "deny")
		w.Header().Set("X-XSS-Protection", "0")
		w.Header().Set("Server", "Go")
		next.ServeHTTP(w, r)
	})
}

// 2. Telemetry and Traffic Request Logging
func (app *application) logRequest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var (
			ip     = r.RemoteAddr
			proto  = r.Proto
			method = r.Method
			uri    = r.URL.RequestURI()
		)

		app.logger.Info("received request", "ip", ip, "proto", proto, "method", method, "uri", uri)
		next.ServeHTTP(w, r)
	})
}

// 3. Centralized Stack Unwinding and Crash Recovery
func (app *application) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				w.Header().Set("Connection", "close")
				app.serverError(w, r, fmt.Errorf("%s", err))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// =========================================================================
// Stateless JWT & Role Authentication (API Gateway Security via LoginRadius)
// =========================================================================

// requireJWTInterceptor validates incoming LoginRadius tokens inside HTTP headers
func (app *application) requireJWTInterceptor(next http.Handler*) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "missing authorization header", http.StatusUnauthorized)
			return
		}

		headerParts := strings.Split(authHeader, " ")
		if len(headerParts) != 2 || headerParts[0] != "Bearer" {
			http.Error(w, "invalid token format", http.StatusUnauthorized)
			return
		}
		tokenString := headerParts[1]

		secret := os.Getenv("LOGINRADIUS_JWT_SECRET")
		if secret == "" {
			app.logger.Error("LOGINRADIUS_JWT_SECRET environment variable is missing")
			http.Error(w, "internal configurations error", http.StatusInternalServerError)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected token signing algorithm: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			app.logger.Warn("Failed incoming JWT verification attempt", "err", err)
			http.Error(w, "invalid or expired token claims", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "malformed token payload claims", http.StatusUnauthorized)
			return
		}

		uid, _ := claims["uid"].(string)
		role, _ := claims["role"].(string)

		payload := UserPayload{
			LoginRadiusID: uid,
			Role:          role,
		}

		ctx := context.WithValue(r.Context(), userPayloadContextKey, payload)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// EnforceRole restricts targeted API paths exclusively to verified roles
func (app *application) EnforceRole(requiredRole string, next http.Handler) http.Handler {
	return app.requireJWTInterceptor(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		payload, ok := r.Context().Value(userPayloadContextKey).(UserPayload)
		if !ok {
			http.Error(w, "authorization identity context missing", http.StatusInternalServerError)
			return
		}

		if payload.Role != requiredRole {
			app.logger.Warn("Unauthorized role verification breach", "uid", payload.LoginRadiusID, "required", requiredRole, "found", payload.Role)
			http.Error(w, "forbidden: role context permissions violation", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	}))
}