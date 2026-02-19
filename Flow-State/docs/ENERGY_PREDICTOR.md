# FlowState — ML Energy Prediction System

## Overview

The Energy Predictor estimates a user's cognitive energy level (0–100) using a LightGBM model exported to ONNX format. It runs entirely on-device inside the Electron main process — no cloud calls, no data leaves the machine.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Electron Main Process (Node.js)                            │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐   │
│  │  Keyboard    │   │  Mouse       │   │  Window        │   │
│  │  Monitor     │   │  Monitor     │   │  Tracker       │   │
│  │  (uiohook)   │   │  (uiohook)   │   │  (active-win)  │   │
│  └─────┬────────┘   └─────┬────────┘   └────────────────┘   │
│        │ EMA smoothed     │ EMA smoothed                    │
│        ▼                  ▼                                 │
│  ┌─────────────────────────────┐                            │
│  │  SQLite Database            │  ← saves metrics every 60s │
│  │  (activity_events table)    │                            │
│  └─────────────┬───────────────┘                            │
│                ▼                                            │
│  ┌─────────────────────────────┐                            │
│  │  Feature Extractor          │  ← reads DB + questionnaire│
│  │  (18 features for energy)   │     + baseline + session   │
│  └─────────────┬───────────────┘                            │
│                ▼                                            │
│  ┌─────────────────────────────┐                            │
│  │  ML Pipeline (ONNX Runtime) │                            │
│  │  ┌─────────────────────┐    │                            │
│  │  │ Energy Model (LGB)  │────┼─► raw score (0-100)       │
│  │  └─────────────────────┘    │                            │
│  │  ┌─────────────────────┐    │                            │
│  │  │ Smoothing Engine     │────┼─► smoothed score          │
│  │  │ (EMA + Δ-clamping)  │    │                            │
│  │  └─────────────────────┘    │                            │
│  └─────────────┬───────────────┘                            │
│                │ IPC: 'energy-update'                       │
│                ▼                                            │
│  ┌─────────────────────────────┐                            │
│  │  Renderer (React/Zustand)   │                            │
│  │  Dashboard, Header, Gauge   │  ← displays smoothed score│
│  └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Energy Model Features (18 inputs)

| # | Feature | Source | Range |
|---|---------|--------|-------|
| 1 | `typing_speed_5min` | Keyboard monitor → DB | 0–200 KPM |
| 2 | `typing_speed_15min` | Keyboard monitor → DB | 0–200 KPM |
| 3 | `error_rate_5min` | Keyboard monitor → DB | 0–0.3 (capped) |
| 4 | `error_rate_15min` | Keyboard monitor → DB | 0–0.3 (capped) |
| 5 | `mouse_entropy` | Mouse monitor → DB | 0–1 |
| 6 | `idle_percentage` | Mouse monitor → DB | 0–1 |
| 7 | `session_duration` | App state | minutes |
| 8 | `time_since_break` | App state | minutes |
| 9 | `tasks_completed_hour` | Task DB | count |
| 10 | `hour_of_day` | System clock | 0–23 |
| 11 | `day_of_week` | System clock | 0–6 |
| 12 | `sleep_quality` | Morning questionnaire | 1–10 |
| 13 | `stress_level` | Morning questionnaire | 1–10 |
| 14 | `caffeine_intake` | Morning questionnaire | 0–3 |
| 15 | `exercise_today` | Morning questionnaire | 0 or 1 |
| 16 | `expected_difficulty` | Morning questionnaire | 1–10 |
| 17 | `typing_speed_ratio` | Computed (current / baseline) | 0–3 (capped) |
| 18 | `error_rate_ratio` | Computed (current / baseline) | 0–3 (capped) |

## Smoothing Mechanics

### Problem
Raw model output is volatile — typing at 180 KPM gives energy ~75, stopping gives ~15. A 60-point drop in one cycle feels unrealistic.

### Solution: Three-Layer Smoothing

#### Layer 1: Input Smoothing (Monitors)
- **Keyboard** (`keyboard-monitor.js`): EMA smoothing on `typingSpeed` and `errorRate` (α=0.3). When idle, speed decays gradually instead of dropping to 0.
- **Mouse** (`mouse-monitor.js`): EMA smoothing on `entropy` and `idlePercentage` (α=0.3).

#### Layer 2: Feature Capping (Feature Extractor)
- `error_rate` capped at 0.3 (30%) — prevents backspace spam from crashing energy
- `error_rate_ratio` and `typing_speed_ratio` capped at 3.0× baseline

#### Layer 3: Output Smoothing (ML Pipeline)
- **Initial Anchor**: First prediction seeds at 55 (moderate energy), not raw model output
- **Warm-up Phase** (first 3 cycles): Extra-tight α=0.15, maxΔ=±3 points
- **Normal Phase**: EMA α=0.25, maxΔ=±5 points per 60s cycle
- **Energy Floor**: Score never drops below 20 unless raw model consistently pushes below 15
- **Time-adaptive**: If >60s between cycles, α and maxΔ scale up (capped at 1.5×)

### Result
| Scenario | Before (raw) | After (smoothed) |
|----------|-------------|-------------------|
| Fast typing → Stop | 75 → 12 (instant) | 75 → 70 → 65 → ... (gradual) |
| Backspace spam | 60 → 5 (crash) | 60 → 58 (barely moves) |
| App just started | Random (10–80) | Always 55, adjusts over 3 min |

## Key Files

| File | Purpose |
|------|---------|
| `main/monitoring/keyboard-monitor.js` | Keystroke tracking + EMA smoothing |
| `main/monitoring/mouse-monitor.js` | Mouse tracking + EMA smoothing |
| `main/ml/feature-extractor.js` | Extracts 18 features + caps out-of-range values |
| `main/services/ml-inference.js` | ONNX inference + output smoothing engine |
| `main/main.js` | Pipeline orchestration, 60s loop, IPC dispatch |
| `src/stores/flowstate-store.ts` | Zustand store with `setMLEnergy()` action |
| `src/App.tsx` | Wires IPC `energy-update` → Zustand store |
| `main/ml/models/energy-model.onnx` | Trained LightGBM model (110 KB) |
| `ml-service/train_model.py` | Training script + synthetic data generation |

## Data Storage

All activity metrics are stored in a local **SQLite database** (`flowstate.db`):
- `activity_events` table: typing speed, error rate, mouse entropy, idle % (every 60s)
- `questionnaire_responses` table: morning check-in answers
- `baselines` table: learned user baseline (typing speed, error rate)
- `app_usage` table: which apps are used and for how long

Data never leaves the device. Retention period is configurable (default: 30 days).

## Questionnaire Impact

The morning check-in directly affects energy prediction:

| Good Answers | → Higher Energy |
|---|---|
| Sleep Quality: 8–10 | +40–50 base points |
| Stress Level: 1–3 | +21–27 base points |
| Exercise: Yes | +5 base points |
| Caffeine: 1–2 | +3–6 base points |

Without questionnaire data, defaults are used (sleep=7, stress=3, caffeine=1, exercise=No).
