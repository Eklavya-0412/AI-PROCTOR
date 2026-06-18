# Project Plan: AI-Proctored Online Judge & Examination Platform

**Tech Stack:** Go, React, TypeScript, Vite, MongoDB, Docker SDK, LoginRadius, TensorFlow.js, Monaco Editor

## Phase 1: Database & Telemetry Schemas (Go + MongoDB)
- [ ] **Design the Collections**
  - [ ] `Exams`: Metadata, language config, permissions (camera/mic toggles), problems, hidden test cases.
  - [ ] `Submissions`: Student code, language, execution results (AC/WA/TLE), Viva chat history.
  - [ ] `ProctorTelemetry`: Silent, timestamped infractions (face anomalies, tab switching, etc.).
- [ ] **Build Custom Logging Engine**
  - [ ] Extend base application's `log/slog` text/JSON handler.
  - [ ] Dual-write logs: standard output (operational) and external file (e.g., `/var/log/proctor_audit.log`).

## Phase 2: Secure Backend Foundations (Go + LoginRadius)
- [ ] **Authentication Middleware**
  - [ ] Intercept requests, verify LoginRadius JWT.
  - [ ] Parse user role (Instructor/Student) into request context.
- [ ] **Instructor APIs**
  - [ ] CRUD handlers for creating and managing exams.
  - [ ] Integrate input validation using base `Validator` type.
- [ ] **Student APIs**
  - [ ] Fetch exam questions (ensure hidden test cases are stripped before sending to client).

## Phase 3: The Isolated Sandbox Engine (Go + Docker SDK)
- [ ] **Initialize Docker Client**
  - [ ] Import `github.com/docker/docker/client` into the Go application struct.
- [ ] **Build Task Worker Queue**
  - [ ] Create a buffered channel (`chan SubmissionTask`).
  - [ ] Spawn a fixed pool of background worker goroutines to handle concurrent submissions.
- [ ] **Implement Container Lifecycle**
  - [ ] Dynamically pull Alpine images (`python:alpine`, `gcc:alpine`, etc.).
  - [ ] Mount student code, set aggressive constraints (`--network none`, `--memory="128mb"`, `pids-limit`).
  - [ ] Wrap in `context.WithTimeout` (2-5 seconds).
  - [ ] Capture `stdout/stderr`, compare to hidden test cases, return AC/WA/TLE.

## Phase 4: Frontend Development (React + TypeScript + Vite)
- [ ] **Setup React Architecture**
  - [ ] Initialize Vite + React + TypeScript.
  - [ ] Configure Tailwind CSS.
  - [ ] Connect LoginRadius Web SDK.
- [ ] **Integrate Monaco Editor**
  - [ ] Embed `@monaco-editor/react`.
  - [ ] Add dynamic language toggling (Python, C++, Java).
- [ ] **Enforce UI Lockdowns**
  - [ ] Intercept copy/cut/paste and right-clicks.
  - [ ] Capture `visibilitychange` and `blur` events for tab-switching detection.
- [ ] **Inject Edge AI Models (Silent Proctoring)**
  - [ ] Import TensorFlow.js / MediaPipe.
  - [ ] Run webcam loop on hidden canvas to count faces and track gaze.
- [ ] **Silent Telemetry Streamer**
  - [ ] Async HTTP POST pipeline to send infractions to the Go backend without UI disruption.

## Phase 5: Post-Exam AI Viva & Review Dashboard
- [ ] **Build Post-Submission Viva UI**
  - [ ] Lock code editor on final submit.
  - [ ] Render the Viva chat panel next to the final code.
- [ ] **Implement LLM Viva Generator (Go)**
  - [ ] Prompt LLM API with final code to generate 3 custom, highly specific conceptual questions.
  - [ ] Stream AI questions to the frontend and evaluate student responses.
- [ ] **Build Instructor Audit Dashboard**
  - [ ] View submitted code and Docker compilation results.
  - [ ] View the AI Viva chat transcript.
  - [ ] View chronological timeline of silent proctoring flags (from DB/logs).