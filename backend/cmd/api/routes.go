package main

import (
	"net/http"

	"github.com/justinas/alice"
)

// Update the signature for the routes() method so that it returns a
// http.Handler instead of *http.ServeMux.
func (app *application) routes() http.Handler {
	mux := http.NewServeMux()
	// Create a new middleware chain containing the middleware specific to our
	// dynamic application routes. For now, this chain will only contain the
	// LoadAndSave session middleware but we'll add more to it later.
	dynamic := alice.New(app.sessionManager.LoadAndSave,noSurf,app.authenticate)
	// Update these routes to use the new dynamic middleware chain followed by
	// the appropriate handler function. Note that because the alice ThenFunc()
	// method returns a http.Handler (rather than a http.HandlerFunc) we also
	// need to switch to registering the route using the mux.Handle() method.
    mux.Handle("POST /user/signup", dynamic.ThenFunc(app.userSignupPost))
    mux.Handle("POST /user/login", dynamic.ThenFunc(app.userLoginPost))
	protected := dynamic.Append(app.requireAuthentication)
	mux.Handle("POST /user/logout", protected.ThenFunc(app.userLogoutPost))
	standard := alice.New(app.recoverPanic, app.logRequest, commonHeaders)
	// Return the 'standard' middleware chain followed by the servemux.
	return standard.Then(mux)
}
