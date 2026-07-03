package main

import (
	"net/http"

	"github.com/justinas/alice"
)

func (app *application) routes() http.Handler {
	mux := http.NewServeMux()
	
	// Existing dynamic middleware (Session, CSRF, Auth)
	dynamic := alice.New(app.sessionManager.LoadAndSave, noSurf, app.authenticate)
	
	mux.Handle("POST /user/signup", dynamic.ThenFunc(app.userSignupPost))
	mux.Handle("POST /user/login", dynamic.ThenFunc(app.userLoginPost))
	
	protected := dynamic.Append(app.requireAuthentication)
	mux.Handle("POST /user/logout", protected.ThenFunc(app.userLogoutPost))
	
	// API Routes by Mock Auth
	
	// Create an API specific middleware chain that injects the mock user data
	apiChain := dynamic.Append(app.mockAuthMiddleware)
	
	// Exam Routes
	mux.Handle("GET /api/exams", apiChain.ThenFunc(app.getExamsHandler))
	mux.Handle("GET /api/exams/{id}", apiChain.ThenFunc(app.getExamByIDHandler))
	
	// Protected Instructor Routes (Notice the requireRole middleware appended here)
	instructorChain := apiChain.Append(app.requireRole("Instructor"))
	mux.Handle("POST /api/exams", instructorChain.ThenFunc(app.createExamHandler))
	
	// Submission Routes
	mux.Handle("POST /api/submissions", apiChain.ThenFunc(app.submitCodeHandler))

	// Standard middleware for logging, panic recovery, and headers
	standard := alice.New(app.recoverPanic, app.logRequest, commonHeaders)
	
	return standard.Then(mux)
}