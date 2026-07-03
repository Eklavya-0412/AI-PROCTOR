package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Exam struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	InstructorID    primitive.ObjectID `bson:"instructor_id" json:"instructor_id"`
	Title           string             `bson:"title" json:"title"`
	DurationMinutes int                `bson:"duration_minutes" json:"duration_minutes"`
	Settings        ExamSettings       `bson:"settings" json:"settings"`
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	ProblemSet      []Problem          `bson:"problem_set" json:"problem_set"`
}
type ExamSettings struct {
	RequireCamera     bool `bson:"require_camera" json:"require_camera"`
	ReuquireMic       bool `bson:"require_mic" json:"require_mic"`
	BlockTabSwitching bool `bson:"block_tab_switching" json:"block_tab_switching"`
	BlockCopyPaste    bool `bson:"block_copy_paste" json:"block_copy_paste"`
}
type Problem struct {
	ProblemID        string     `bson:"problem_id" json:"problem_id"`
	Title            string     `bson:"title" json:"title"`
	Description      string     `bson:"description" json:"description"`
	AllowedLanguages []string   `bson:"allowed_languages" json:"allowed_languages"`
	TestCases        []TestCase `bson:"test_cases" json:"test_cases"`
}
type TestCase struct {
	Input          string `bson:"input" json:"input"`
	ExpectedOutput string `bson:"expected_output" json:"expected_output"`
	IsHidden       bool   `bson:"is_hidden" json:"is_hidden"`
}

type Submission struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ExamID          primitive.ObjectID `bson:"exam_id" json:"exam_id"`
	StudentID       primitive.ObjectID `bson:"student_id" json:"student_id"`
	ProblemID       string             `bson:"problem_id" json:"problem_id"`
	Language        string             `bson:"language" json:"language"`
	RawCode         string             `bson:"raw_code" json:"raw_code"`
	Status          string             `bson:"status" json:"status"` // "Accepted", "Wrong Answer", "TLE"
	ExecutionTimeMs int                `bson:"execution_time_ms" json:"execution_time_ms"`
	VivaTranscript  []VivaQA           `bson:"viva_transcript" json:"viva_transcript"`
	SubmittedAt     time.Time          `bson:"submitted_at" json:"submitted_at"`
}

type VivaQA struct {
	AIQuestion    string  `bson:"ai_question" json:"ai_question"`
	StudentAnswer string  `bson:"student_answer" json:"student_answer"`
	Score         float64 `bson:"score" json:"score"`
}

type TelemetryLog struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ExamID         primitive.ObjectID `bson:"exam_id" json:"exam_id"`
	StudentID      primitive.ObjectID `bson:"student_id" json:"student_id"`
	InfractionType string             `bson:"infraction_type" json:"infraction_type"`
	Severity       string             `bson:"severity" json:"severity"`
	Timestamp      time.Time          `bson:"timestamp" json:"timestamp"`
}
