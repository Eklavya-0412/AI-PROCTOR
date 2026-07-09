package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"proctor/internal/models"
	"proctor/internal/sandbox"
	"proctor/internal/validator"
	"strings"
	"time"

	"fmt"

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
type LRUserProfile struct {
	Uid          string `json:"Uid"`
	CustomFields struct {
		Role string `json:"role"`
	} `json:"CustomFields"`
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

	fmt.Println("--- HIT CREATE EXAM HANDLER ---")

	var input struct {
		Title           string              `json:"title"`
		DurationMinutes int                 `json:"duration_minutes"`
		Settings        models.ExamSettings `json:"settings"`
		ProblemSet      []models.Problem    `json:"problem_set"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		fmt.Println("JSON DECODE ERROR:", err)
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

	result, err := app.submissions.Insert(submission)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Code submitted for evaluation",
		"submission_id": result.InsertedID,
	})
	go func(subID primitive.ObjectID, code string) {
		app.logger.Info("Starting Docker sandbox for submission", "id", subID.Hex())

		// hardcode python for now
		execResult, err := sandbox.RunPythonCode(code, "")
		if err != nil {
			app.logger.Error("Sandbox execution failed critically", "error", err)
			return
		}

		app.logger.Info("Sandbox finished", "status", execResult.Status, "timeMs", execResult.ExecutionTimeMs)

		// Determine the final grade based on the container exit status
		finalGrade := "Wrong Answer"
		if execResult.Status == "Success" {
			finalGrade = "Accepted"
		} else {
			finalGrade = execResult.Status
		}

		// 4. Update the Submission document in MongoDB with the final grade
		err = app.submissions.UpdateStatus(subID, finalGrade, execResult.ExecutionTimeMs)
		if err != nil {
			app.logger.Error("Failed to update submission status in DB", "error", err)
		}

	}(result.InsertedID.(primitive.ObjectID), input.RawCode)
}

func (app *application) getSubmissionStatusHandler(w http.ResponseWriter, r *http.Request) {
	idParam := r.PathValue("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}

	sub, err := app.submissions.GetByID(objID)
	if err != nil {
		app.clientError(w, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sub)
}

func (app *application) createSessionHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		LRToken string `json:"lr_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		app.clientError(w, http.StatusBadRequest)
		return
	}
	apiKey := os.Getenv("LR_API_KEY")
	// 1. Ask LoginRadius who this token belongs to
	req, _ := http.NewRequest("GET", "https://api.loginradius.com/identity/v2/auth/account", nil)
	req.Header.Add("Authorization", "Bearer "+input.LRToken)
	req.Header.Add("X-LoginRadius-ApiKey", apiKey)

	// URL.Query() returns a COPY — must assign back to RawQuery
	q := req.URL.Query()
	q.Add("access_token", input.LRToken)
	req.URL.RawQuery = q.Encode()

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)

	if err != nil || resp.StatusCode != http.StatusOK {
		app.logger.Error("Failed to verify LoginRadius token")
		app.clientError(w, http.StatusUnauthorized)
		return
	}
	defer resp.Body.Close()

	// 2. Extract the User ID and Custom Role
	var lrProfile LRUserProfile
	if err := json.NewDecoder(resp.Body).Decode(&lrProfile); err != nil {
		app.serverError(w, r, err)
		return
	}

	// If they didn't select a role, default to Student
	role := lrProfile.CustomFields.Role
	if role == "" {
		role = "Student"
	}

	// 3. Bake the Secure Cookie!

	cookieValue := fmt.Sprintf("%s|%s", lrProfile.Uid, role)

	http.SetCookie(w, &http.Cookie{
		Name:     "proctor_session",
		Value:    cookieValue,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		MaxAge:   86400,
	})

	// 4. Send the role back to React so it knows which dashboard to load
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"role":    role,
		"user_id": lrProfile.Uid,
	})
}

// 2. Restore Session
func (app *application) getMeHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("proctor_session")
	if err != nil {
		app.clientError(w, http.StatusUnauthorized)
		return
	}

	// Extract the data from the cookie
	parts := strings.Split(cookie.Value, "|")
	if len(parts) != 2 {
		app.clientError(w, http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"user_id": parts[0],
		"role":    parts[1],
	})
}

func (app *application) logoutHandler(w http.ResponseWriter, r *http.Request) {

	http.SetCookie(w, &http.Cookie{
		Name:     "proctor_session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		MaxAge:   -1,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Logged out successfully",
	})
}
