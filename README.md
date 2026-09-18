# Code Execution Sandbox & AI Proctoring Platform

An automated, highly scalable code execution and proctoring platform featuring a real-time code editor and a secure, isolated sandbox environment. The backend is built with a strict separation of concerns, ensuring secure data transfer and reliable remote code execution.

##  Key Features

* **Isolated Code Execution:** A robust Go-based execution engine that runs submitted problem code inside secure, ephemeral Docker containers, preventing malicious payloads and handling timeouts/memory limits.
* **Strict Layered Architecture:** A highly decoupled backend flow ensuring predictable data mutation and clean business logic: `Routes → Controllers → DTOs → Services → Problem Schemas`.
* **Data Validation Pipeline:** Dedicated DTO (Data Transfer Object) layers validate all incoming client payloads before they reach the execution engine.
* **Dedicated Problem Schemas:** Coding problems, constraints, and test cases are isolated in dedicated schema files for easy management and scalable evaluation.
* **Real-Time Editor:** Seamless frontend interface built for live coding, continuous proctoring, and immediate sandbox feedback.

##  Tech Stack

* **Backend / Execution Engine:** Go
* **Frontend Client:** React
* **Database:** MongoDB
* **Containerization:** Docker

##  Architecture & Data Flow

This project follows a strict layered architecture designed to prevent logic entanglement and make debugging modular components simple.

1. **Routes:** Map incoming HTTP requests to their respective controllers.
2. **Controllers:** Act strictly as traffic directors. They parse the incoming request and pass the payload to the DTO layer.
3. **DTOs (Data Transfer Objects):** Validate the incoming data from the frontend, ensuring payloads exactly match what the execution engine expects before hitting the core logic.
4. **Services:** Handle the heavy lifting, including interacting with the Docker sandbox daemon, processing proctoring data, and calculating results.
5. **Schemas:** Dedicated files for defining problem models, evaluation criteria, and database interactions.

##  Local Setup & Installation

### Prerequisites

* [Go](https://golang.org/doc/install?utm_source=gemini) (1.20+)
* [Node.js & npm](https://nodejs.org/?utm_source=gemini)
* [Docker](https://docs.docker.com/get-docker/?utm_source=gemini) (Must be running locally to spin up execution containers)
* [MongoDB](https://www.mongodb.com/try/download/community?utm_source=gemini)

### Backend (Go & Docker Sandbox)

```bash
# Clone the repository
git clone https://github.com/your-username/proctoring-sandbox.git
cd proctoring-sandbox/backend

# Install Go modules
go mod download

# Set up environment variables (create a .env file based on .env.example)
# Ensure Docker daemon is running, then start the server
go run main.go

```

### Frontend (React)

```bash
# Open a new terminal instance
cd proctoring-sandbox/frontend

# Install dependencies
npm install

# Start the development server
npm start

```

## 🧪 Testing the Sandbox

To verify the Docker execution engine is securely isolated and properly evaluating code against the problem schemas:

1. Ensure your MongoDB instance is populated with at least one sample problem schema.
2. Ensure the Docker desktop/daemon is running in the background.
3. Submit a payload via the React frontend (or via Postman to the submission endpoint).
4. Monitor the backend terminal to verify:
* The DTO validation passes.
* The Service layer successfully spins up an ephemeral Docker container.
* The container executes the code and returns the correct pass/fail/timeout state before destroying itself.



## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
