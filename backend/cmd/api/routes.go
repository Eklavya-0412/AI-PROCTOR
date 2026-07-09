package main

import (
	"net/http"

	"github.com/justinas/alice"
)

func (app *application) routes() http.Handler {
	mux := http.NewServeMux()

	// Existing dynamic middleware (Session, CSRF, Auth) — for browser-rendered forms
	dynamic := alice.New(app.sessionManager.LoadAndSave, noSurf, app.authenticate)

	mux.Handle("POST /user/signup", dynamic.ThenFunc(app.userSignupPost))
	mux.Handle("POST /user/login", dynamic.ThenFunc(app.userLoginPost))

	protected := dynamic.Append(app.requireAuthentication)
	mux.Handle("POST /user/logout", protected.ThenFunc(app.userLogoutPost))

	// API Routes — skip noSurf because the React SPA uses fetch() with JSON
	// and custom headers, which cannot carry noSurf's CSRF cookie/token pair.
	apiBase := alice.New(app.sessionManager.LoadAndSave, app.authenticate)
	apiChain := apiBase.Append(app.mockAuthMiddleware)

	// Exam Routes
	mux.Handle("GET /api/exams", apiChain.ThenFunc(app.getExamsHandler))
	mux.Handle("GET /api/exams/{id}", apiChain.ThenFunc(app.getExamByIDHandler))

	mux.Handle("POST /api/auth/session", apiChain.ThenFunc(app.createSessionHandler))
	mux.Handle("GET /api/auth/me", apiChain.ThenFunc(app.getMeHandler))
	mux.Handle("POST /api/auth/logout", apiChain.ThenFunc(app.logoutHandler))
	// Protected Instructor Routes (Notice the requireRole middleware appended here)
	instructorChain := apiChain.Append(app.requireRole("Instructor"))
	mux.Handle("POST /api/exams", instructorChain.ThenFunc(app.createExamHandler))

	// Submission Routes
	mux.Handle("POST /api/submissions", apiChain.ThenFunc(app.submitCodeHandler))

	// Standard middleware for logging, panic recovery, and headers
	standard := alice.New(app.recoverPanic, app.logRequest, commonHeaders, app.enableCORS)

	return standard.Then(mux)
}
