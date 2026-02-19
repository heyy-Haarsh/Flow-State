# FlowState — AI-Powered Smart Task & Energy Manager

> Work smarter by working with your natural rhythms, not against them.

FlowState is a privacy-first productivity platform that monitors your cognitive energy in real-time, predicts when you're in peak focus, and surfaces the right tasks at the right moment — preventing burnout before it happens.

---

## Repository Structure

```
FlowState/
├── Flow-State/              # Desktop app (Electron + React + TypeScript)
├── manager-portal/          # Manager web dashboard (React)
└── manager-portal-backend/  # REST API backend (Express + PostgreSQL)
```

---

## Components

### 1. Flow-State — Desktop App

The core employee-facing desktop application. Built with Electron so it runs natively on Windows, macOS, and Linux.

**What it does:**
- Tracks typing speed and error rates in the background — never keystroke content
- Runs a personalized ML model to predict your cognitive energy score (0–100) every 60 seconds
- Suggests high-focus tasks when energy is high, lighter work when energy is low
- Triggers smart break interventions before burnout sets in
- Detects and notifies you when you enter a flow state
- Week 1 calibration: morning questionnaires train a model to your unique patterns; after Day 7, predictions run fully automatically

**Tech Stack:**

| Layer | Technology |
|---|---|
| Desktop Framework | Electron 28 |
| UI | React 18, TypeScript, TailwindCSS |
| State Management | Zustand |
| Charts | Recharts |
| Database | SQLite (better-sqlite3) |
| ML Training | Python — LightGBM, scikit-learn |
| ML Inference | ONNX Runtime for Node.js |
| Icons | Lucide React |

**App Pages:**
- **Dashboard** — Live energy gauge, current focus status, break nudges
- **Focus Sessions** — Timed deep-work sessions with flow-state detection
- **Tasks** — Energy-aware task list that reorders based on your current state
- **Analytics** — Historical energy trends, burnout heatmaps, weekly focus hours
- **Questionnaire** — Daily calibration prompts (Week 1 only)
- **Privacy** — Data retention controls, export, and full deletion
- **Settings** — Notifications, break reminders, tracking preferences

---

### 2. manager-portal — Web Dashboard

A React web app for team leads and managers to monitor team productivity and assign tasks.

**What it does:**
- View employee energy and focus trends (anonymized summaries)
- Assign tasks to employees
- Monitor team-level burnout risk

**Tech Stack:** React 19, React Router, TailwindCSS, Framer Motion, Axios

---

### 3. manager-portal-backend — REST API

The backend that powers the manager portal. Handles authentication, employee management, and task assignment.

**Tech Stack:** Node.js, Express 5, PostgreSQL (`pg`), JWT (`jsonwebtoken`), bcrypt

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a manager or employee |
| POST | `/api/auth/login` | Login and receive a JWT |
| GET | `/api/employees` | List all employees (manager only) |
| POST | `/api/tasks` | Assign a task to an employee |
| GET | `/api/tasks` | Get all tasks for the current user |
| PUT | `/api/tasks/:id` | Update a task |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 14+ (for the manager portal backend)

---

### Flow-State Desktop App

```bash
cd Flow-State

# Install Node dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Install Python ML service dependencies
cd ml-service
pip install -r requirements.txt
cd ..

# Run in development mode
npm run dev:electron

# Build distributable
npm run build:electron
```

To start the Python ML training service separately:

```bash
npm run ml:start    # Start Flask inference server
npm run ml:train    # Train/retrain the model
```

---

### Manager Portal (Frontend)

```bash
cd manager-portal
npm install
npm run dev
```

---

### Manager Portal Backend

```bash
cd manager-portal-backend
npm install
```

Create a `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowstate_manager
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=3001
```

Set up the database:

```bash
psql -U postgres -c "CREATE DATABASE flowstate_manager;"
psql -U postgres -d flowstate_manager < src/config/database.sql
```

Start the server:

```bash
npm run dev      # Development (nodemon)
npm start        # Production
```

Health check: `http://localhost:3001/health`

---

## Privacy

FlowState is built privacy-first. All desktop app data stays on your device.

- Only typing speed and error rates are measured — never what you type
- No cloud sync, no telemetry, no keystroke content logging
- Configurable data retention: 7, 30, or 90 days, or keep forever
- Export or permanently delete your data from the Privacy page at any time

---

## How the ML Pipeline Works

1. **Week 1:** Each morning, a short questionnaire asks about sleep, stress, and energy. Typing metrics are collected passively throughout the day.
2. **Day 7:** A LightGBM model is trained on your personal data and exported to ONNX format.
3. **Day 8+:** The ONNX model runs inside Electron every 60 seconds, producing a real-time energy score without any questionnaires. No data ever leaves your machine.

---

## License

MIT
