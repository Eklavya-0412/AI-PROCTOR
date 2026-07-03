package main

type contextKey string

const isAuthenticatedContextKey = contextKey("isAuthenticated")
const (
	userIDKey contextKey = "userID"
	roleKey   contextKey = "role"
)
