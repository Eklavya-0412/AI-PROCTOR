package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"proctor/internal/models"
	"proctor/internal/validator"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type userSignupForm struct {
	Name                string `form:"name"`
	Email               string `form:"email"`
	Password            string `form:"password"`
	validator.Validator `form:"-"`
}

func (app *application) userSignupPost(w http.ResponseWriter, r *http.Request) {
	var form userSignupForm
	err := app.decodePostForm(r, &form)
	if err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}

	form.CheckField(validator.NotBlank(form.Name), "name", "This field cannot be blank")
	form.CheckField(validator.NotBlank(form.Email), "email", "This field cannot be blank")
	form.CheckField(validator.Matches(form.Email, validator.EmailRX), "email", "This field must be a valid email address")
	form.CheckField(validator.NotBlank(form.Password), "password", "This field cannot be blank")
	form.CheckField(validator.MinChars(form.Password, 8), "password", "This field must be at least 8 characters long")

	if !form.Valid() {
		app.clientError(w, http.StatusUnprocessableEntity)
		return
	}

	err = app.users.Insert(r.Context(), form.Name, form.Email, form.Password)
	if err != nil {
		if errors.Is(err, models.ErrDuplicateEmail) {
			app.clientError(w, http.StatusConflict)
		} else {
			app.serverError(w, r, err)
		}
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("User created successfully"))
}

type userLoginForm struct {
	Email               string `form:"email"`
	Password            string `form:"password"`
	validator.Validator `form:"-"`
}

func (app *application) userLoginPost(w http.ResponseWriter, r *http.Request) {
	var form userLoginForm
	err := app.decodePostForm(r, &form)
	if err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}

	form.CheckField(validator.NotBlank(form.Email), "email", "This field cannot be blank")
	form.CheckField(validator.Matches(form.Email, validator.EmailRX), "email", "This field must be a valid email address")
	form.CheckField(validator.NotBlank(form.Password), "password", "This field cannot be blank")

	if !form.Valid() {
		app.clientError(w, http.StatusUnprocessableEntity)
		return
	}

	id, err := app.users.Authenticate(r.Context(), form.Email, form.Password)
	if err != nil {
		if errors.Is(err, models.ErrInvalidCredentials) {
			app.clientError(w, http.StatusUnauthorized)
		} else {
			app.serverError(w, r, err)
		}
		return
	}

	err = app.sessionManager.RenewToken(r.Context())
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	app.sessionManager.Put(r.Context(), "authenticatedUserID", id.Hex())
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Logged in successfully"))
}

func (app *application) userLogoutPost(w http.ResponseWriter, r *http.Request) {
	err := app.sessionManager.RenewToken(r.Context())
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	app.sessionManager.Remove(r.Context(), "authenticatedUserID")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Logged out successfully"))
}

// EXAM AND SUBMISSIONS 

func (app *application) createExamHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title           string                `json:"title"`
		DurationMinutes int                   `json:"duration_minutes"`
		Settings        models.ExamSettings   `json:"settings"`
		ProblemSet      []models.Problem      `json:"problem_set"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}

	// In a real scenario, extract InstructorID from session/JWT. 
	// For now, generating a new ObjectID to satisfy the schema.
	instructorID := primitive.NewObjectID() 

	exam := models.Exam{
		InstructorID:    instructorID,
		Title:           input.Title,
		DurationMinutes: input.DurationMinutes,
		Settings:        input.Settings,
		ProblemSet:      input.ProblemSet,
		CreatedAt:       time.Now(),
	}

	// Assuming app.exams.Insert is implemented in your models package
	result, err := app.exams.Insert(exam)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Exam created successfully",
		"exam_id": result.InsertedID,
	})
}

func (app *application) getExamsHandler(w http.ResponseWriter, r *http.Request) {
	exams, err := app.exams.GetAll()
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	// Extract the mock role from the context to determine if we should hide test cases
	role, ok := r.Context().Value(roleKey).(string)
	
	// Strip hidden test cases for students
	if ok && role == "Student" {
		for i := range exams {
			for j := range exams[i].ProblemSet {
				var visibleCases []models.TestCase
				for _, tc := range exams[i].ProblemSet[j].TestCases {
					if !tc.IsHidden {
						visibleCases = append(visibleCases, tc)
					}
				}
				exams[i].ProblemSet[j].TestCases = visibleCases
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exams)
}

func (app *application) getExamByIDHandler(w http.ResponseWriter, r *http.Request) {
	idParam := r.PathValue("id")
	
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}

	exam, err := app.exams.GetByID(objID)
	if err != nil {
		app.clientError(w, http.StatusNotFound)
		return
	}

	// Security: Strip hidden test cases for students
	role, ok := r.Context().Value(roleKey).(string)
	if ok && role == "Student" {
		for j := range exam.ProblemSet {
			var visibleCases []models.TestCase
			for _, tc := range exam.ProblemSet[j].TestCases {
				if !tc.IsHidden {
					visibleCases = append(visibleCases, tc)
				}
			}
			exam.ProblemSet[j].TestCases = visibleCases
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exam)
}

func (app *application) submitCodeHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ExamID    string `json:"exam_id"`
		ProblemID string `json:"problem_id"`
		Language  string `json:"language"`
		RawCode   string `json:"raw_code"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}

	examObjID, err := primitive.ObjectIDFromHex(input.ExamID)
	if err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}

	// Mock Student ID for now. Swap with real session/JWT ID later.
	studentID := primitive.NewObjectID()

	submission := models.Submission{
		ExamID:      examObjID,
		StudentID:   studentID,
		ProblemID:   input.ProblemID,
		Language:    input.Language,
		RawCode:     input.RawCode,
		Status:      "Pending Execution",
		SubmittedAt: time.Now(),
	}

	// 1. Save initial submission to DB
	result, err := app.submissions.Insert(submission)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	// 2. TODO: Push submission.ID and Code to the Docker Worker Queue channel here

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Code submitted for evaluation",
		"submission_id": result.InsertedID,
	})
}