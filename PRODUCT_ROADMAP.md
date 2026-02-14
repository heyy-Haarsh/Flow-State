# FlowState — From MVP to Startup Product

## Vision

Transform FlowState from a functional MVP into a **startup-ready commercial product** that helps knowledge workers optimize their cognitive energy and productivity. The app learns your natural rhythms, tracks your focus patterns, and delivers intelligent suggestions at exactly the right moments.

## Core Differentiators

1. **Smart System Tray** — Ambient energy awareness that lives in your menubar, changing color based on your cognitive state
2. **App/Window Tracking** — Automatic productivity insights by understanding what you're actually working on
3. **Privacy-First** — All data stays local, no cloud sync, no tracking of content

---

## Current State

✅ **What Already Works:**
- Electron launches with SQLite (better-sqlite3 rebuilt for Electron)
- Dashboard with energy gauge, tasks, quick stats
- Task CRUD persisted to SQLite via IPC
- Morning/evening questionnaires with auto-trigger
- Rule-based energy scoring with ML fallback
- Intervention engine (break suggestions, flow alerts)
- Activity data pipeline (renderer → IPC → DB every 60s)
- Settings sync (frontend ↔ backend)
- Polished dark theme UI with Tailwind

---

## Phase 1: Foundation (System Tray + Notifications + Window Tracking)
**Goal:** Make FlowState feel like a real desktop app that runs in the background

### 1A. System Tray Icon

**What:**
- Energy-colored tray icon (blue/green/amber/red)
- Context menu with quick actions
- Close-to-tray behavior (don't quit on window close)
- Real-time tooltip showing current energy score

**Implementation:**
- `main/tray/tray-manager.js` — Tray icon management with programmatically generated colored icons
- Modify `main/main.js` — Initialize tray, add 60-second heartbeat loop
- Heartbeat loop: calculate energy → update tray → emit to renderer → run interventions

**Technical Details:**
- Use Electron's built-in `Tray`, `Menu`, `nativeImage` (no new dependencies)
- Generate 16x16 icons on-the-fly using `nativeImage` Canvas API
- Color thresholds: peak (80+), good (60-80), low (40-60), critical (<40)

### 1B. Desktop Notifications

**What:**
- Native OS notifications for interventions (break suggestions, task switches)
- Click notification → bring window to focus + navigate to relevant page
- Respect user notification preferences

**Implementation:**
- `main/services/notification-manager.js` — Notification wrapper
- Modify `main/services/intervention-engine.js` — Call notification manager on intervention
- Wire up existing `intervention` IPC channel (already in preload, never used)

**Technical Details:**
- Use Electron's built-in `Notification` API
- Map intervention types to notification titles/bodies/urgency levels

### 1C. App/Window Tracking

**What:**
- Track which applications you're using and for how long
- Categorize apps as productive/neutral/distracting
- Detect context switches and measure their cost
- Show app usage breakdown in Analytics

**Implementation:**
- Install `active-win@7.0.0` (last CommonJS version)
- Modify `main/monitoring/window-tracker.js` — Replace stubs with real tracking
- New DB tables: `app_usage`, `app_categories`
- New queries: `insertAppUsage`, `getAppUsageByRange`, `getAppCategories`, `setAppCategory`, `getProductiveTime`
- Frontend: Add productivity breakdown to Dashboard, app usage section to Analytics, categorization UI to Settings

**Technical Details:**
- Poll active window every 5 seconds
- Ship with default categorizations:
  - **Productive:** VS Code, Terminal, Notion, Figma, Microsoft Office
  - **Distracting:** YouTube, Reddit, Twitter, Netflix, Discord
  - **Neutral:** Everything else (user-configurable)

### Phase 1 Deliverables

| Component | Files Modified/Created |
|-----------|------------------------|
| System Tray | `main/tray/tray-manager.js` (new), `main/main.js` |
| Notifications | `main/services/notification-manager.js` (new), `main/services/intervention-engine.js` |
| Window Tracking | `main/monitoring/window-tracker.js`, `main/database/migrations.js`, `main/database/queries.js` |
| Frontend | `src/components/Dashboard/QuickStats.tsx`, `src/components/Analytics/Analytics.tsx`, `src/components/Settings/SettingsPage.tsx` |
| Types | `src/types/flowstate.ts`, `src/services/electron-api.ts` |

**Estimated Effort:** 3-5 days

---

## Phase 2: Focus Sessions & Timer
**Goal:** Let users start explicit focus sessions with timer, interruption tracking, and history

### Backend

**New Database Tables:**
```sql
focus_sessions (
    id, task_id FK, start_time, end_time,
    planned_duration, actual_duration, interruption_count,
    energy_at_start, energy_at_end, completed, session_type
)

focus_interruptions (
    id, session_id FK, timestamp,
    interruption_type, app_name, duration_seconds
)
```

**New Queries:**
- `startFocusSession`, `endFocusSession`, `recordInterruption`
- `getActiveFocusSession`, `getFocusHistory`, `getFocusStats`

**New IPC Handlers:**
- `start-focus-session`, `end-focus-session`, `get-active-focus-session`
- `get-focus-history`, `get-focus-stats`

**Integration:**
- When focus session active + window tracker detects switch to "distracting" app → auto-record interruption
- Intervention engine skips non-mandatory interventions during "deep work mode"

### Frontend

**New Store:** `src/stores/focus-store.ts`
- State: `activeSession`, `timerSeconds`, `isPaused`, `interruptions`
- Actions: `startSession`, `pauseSession`, `resumeSession`, `endSession`, `tick`
- Timer uses absolute time (`Date.now() - startTime`) to avoid drift

**New Components:** `src/components/FocusSessions/`
- `FocusTimer.tsx` — Main timer interface
  - Circular countdown timer (reuse EnergyGauge visual style)
  - Task selector dropdown
  - Duration presets: 25min (Pomodoro), 45min, 60min, 90min, custom
  - Interruption counter (live during session)
  - Deep work mode toggle
  - Session completion screen with stats
- `FocusHistory.tsx` — Session history
  - List view: date, task, duration, interruptions, energy delta
  - Weekly focus time total
  - Average session statistics

**Navigation:**
- Add "Focus" tab to sidebar (Timer icon from lucide-react)
- Update `NAV_ITEMS` in `src/utils/constants.ts`
- Add route in `App.tsx`

**Tray Integration:**
- Show "In Focus — 23:45 remaining" in tray context menu during active session

### Phase 2 Deliverables

| Component | Files Modified/Created |
|-----------|------------------------|
| Backend | `main/database/migrations.js`, `main/database/queries.js`, `main/main.js` |
| Frontend Store | `src/stores/focus-store.ts` (new) |
| UI Components | `src/components/FocusSessions/FocusTimer.tsx` (new), `src/components/FocusSessions/FocusHistory.tsx` (new) |
| Integration | `main/services/intervention-engine.js`, `main/tray/tray-manager.js` |
| Navigation | `src/utils/constants.ts`, `src/components/UI/Sidebar.tsx`, `src/App.tsx` |

**Estimated Effort:** 3-4 days

---

## Phase 3: Onboarding & First-Run Experience
**Goal:** New users see value in 30 seconds, understand what FlowState does, and start getting personalized

### Onboarding Flow

**6-Step Wizard:**

1. **Welcome** — Value proposition
   - "Work smarter by working with your natural rhythms"
   - Three key benefits: energy tracking, smart suggestions, privacy-first

2. **How It Works** — Brief explanation
   - Track patterns (not content)
   - Learn your rhythms
   - Suggest the right tasks at the right time

3. **Quick Setup** — Minimal configuration
   - Work hours (start/end time)
   - Primary use case: Developer / Writer / Designer / Researcher / Student / Other
   - Notification preference: All / Important only / Minimal

4. **Calibration Explainer** — Set expectations
   - "For the first 7 days, we'll ask a few questions to personalize your model"
   - Preview of morning check-in
   - "After that, FlowState works automatically"

5. **Privacy Promise** — Reinforce trust
   - Local storage only, no cloud
   - We track HOW you work, not WHAT you work on
   - You own your data

6. **Ready** — Completion
   - "You're all set!"
   - "FlowState is now learning your patterns"
   - Button: "Go to Dashboard"

### Calibration Banner

**Component:** `src/components/Dashboard/CalibrationBanner.tsx`

During Week 1:
```
Day 3/7 — FlowState is learning your patterns
[Progress bar: 3/7 filled]
```

After Day 7:
```
🎉 Calibration complete! Your personal model is ready to train.
[Button: Train Model Now]
```

### Implementation

**Detection:**
- Check `onboarding_completed` setting in DB
- If not set, main process emits `show-onboarding` event
- App.tsx renders full-screen overlay

**Components:** `src/components/Onboarding/`
- `OnboardingFlow.tsx` — Wizard container with animated transitions
- `WelcomeStep.tsx`, `HowItWorksStep.tsx`, `QuickSetupStep.tsx`
- `CalibrationExplainerStep.tsx`, `PrivacyStep.tsx`, `ReadyStep.tsx`

### Phase 3 Deliverables

| Component | Files Modified/Created |
|-----------|------------------------|
| Onboarding UI | 7 new components in `src/components/Onboarding/` |
| Calibration Banner | `src/components/Dashboard/CalibrationBanner.tsx` (new) |
| Integration | `src/App.tsx`, `main/main.js`, `main/preload.js` |
| Settings | `main/database/migrations.js` (onboarding defaults) |

**Estimated Effort:** 2-3 days

---

## Phase 4: AI Insights & Intelligence
**Goal:** Surface actionable insights from accumulated data

### Insights Engine

**File:** `main/services/insights-engine.js`

**Daily Insights:**
- Peak hours today vs historical average
- Context switch count trend (up/down from yesterday)
- Energy trajectory (stable/improving/declining over past week)
- Most productive app today
- Most distracting app today
- Break effectiveness (did breaks actually restore energy?)

**Weekly Patterns:**
- Consistent peak hours detection
- Day-of-week energy patterns (e.g., "Mondays are always low")
- Post-lunch dip severity and duration
- Optimal session length (diminishing returns analysis)
- Break frequency correlation with productivity

**Context Switch Cost:**
- Average time to refocus after switching
- Total "lost time" to context switching per day
- Which app transitions are most costly

**Database:**
```sql
insights (
    id, timestamp, insight_type,
    title, description, data JSON, read
)
```

### Frontend

**Components:** `src/components/Insights/`
- `InsightsDashboard.tsx` — Main insights page
  - Hero "Key Insight" card (most important finding)
  - Daily insight cards with mini visualizations
  - Pattern cards
- `ContextSwitchViz.tsx` — Timeline of app switches
  - Color-coded by category (productive=green, distracting=red)
  - Annotations showing estimated refocus time
- `AppUsageBreakdown.tsx` — Horizontal bar chart
  - Apps sorted by time spent
  - Click to re-categorize
- `WeeklyReport.tsx` — Week-over-week comparison
  - Trend indicators (↑↓)
  - Best/toughest day highlights

**Navigation:**
- Add "Insights" tab to sidebar (Lightbulb icon)

**Integration:**
- Significant insights trigger desktop notifications
- Tray tooltip can show key insight ("Your most productive week ever!")

### Phase 4 Deliverables

| Component | Files Modified/Created |
|-----------|------------------------|
| Insights Engine | `main/services/insights-engine.js` (new) |
| Database | `main/database/migrations.js`, `main/database/queries.js` |
| IPC | `main/main.js`, `main/preload.js` |
| UI Components | 4 new components in `src/components/Insights/` |
| Navigation | `src/utils/constants.ts`, `src/App.tsx` |

**Estimated Effort:** 4-5 days

---

## Phase 5: Polish & Distribution
**Goal:** Delight users and ship a real installer

### 5A. Celebrations & Streaks

**Install:** `canvas-confetti` (3KB, zero deps)

**Components:** `src/components/Celebrations/`
- `ConfettiEffect.tsx` — Canvas confetti on task completion (2-3s burst)
- `StreakBadge.tsx` — Streak counter with fire emoji animation
  - Milestones at 3, 7, 14, 30 days

**Backend:** `main/services/streak-manager.js`
- Track daily_tasks, focus_sessions streaks
- Database table: `streaks`

**Integration:**
- `completeTask()` triggers celebration
- Milestone notifications

### 5B. Auto-Start on Boot

**Implementation:**
```javascript
app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true  // start minimized to tray
})
```

**UI:**
- Toggle in Settings page
- Saves to DB setting `auto_start`

### 5C. Windows Installer

**Electron Builder Configuration:**

1. Create app icon:
   - `icon.ico` (multi-size: 16, 32, 48, 64, 128, 256)
   - `icon.png` (512x512 for builds)

2. Update `electron-builder.json`:
```json
{
    "nsis": {
        "oneClick": false,
        "perMachine": false,
        "allowToChangeInstallationDirectory": true,
        "createDesktopShortcut": true,
        "createStartMenuShortcut": true,
        "shortcutName": "FlowState"
    },
    "win": {
        "target": ["nsis"],
        "icon": "public/assets/icons/icon.ico",
        "requestedExecutionLevel": "asInvoker"
    },
    "asarUnpack": [
        "node_modules/better-sqlite3/**",
        "node_modules/onnxruntime-node/**"
    ]
}
```

3. Build scripts:
```json
{
    "scripts": {
        "build:win": "vite build && electron-builder --win",
        "build:mac": "vite build && electron-builder --mac",
        "build:linux": "vite build && electron-builder --linux"
    }
}
```

### 5D. Auto-Update

**Install:** `electron-updater`

**Implementation:** `main/services/auto-updater.js`
- Check for updates on startup + every 4 hours
- Download in background
- Prompt to install on quit

**Distribution:**
- GitHub Releases hosting
- Configure in `electron-builder.json`:
```json
{
    "publish": {
        "provider": "github",
        "owner": "your-github-username",
        "repo": "flowstate"
    }
}
```

### Phase 5 Deliverables

| Component | Files Modified/Created |
|-----------|------------------------|
| Celebrations | `src/components/Celebrations/ConfettiEffect.tsx`, `StreakBadge.tsx` |
| Streaks | `main/services/streak-manager.js` (new), DB migrations |
| Auto-Start | `main/main.js`, `src/components/Settings/SettingsPage.tsx` |
| Packaging | `electron-builder.json`, icons in `public/assets/icons/` |
| Auto-Update | `main/services/auto-updater.js` (new) |
| Build Scripts | `package.json` |

**Estimated Effort:** 4-5 days

---

## Dependencies Summary

**New Packages (Total: 3):**
| Package | Phase | Purpose | Size |
|---------|-------|---------|------|
| `active-win@7.0.0` | 1 | Window/app tracking | ~50KB |
| `canvas-confetti` | 5 | Task completion celebrations | 3KB |
| `electron-updater` | 5 | Auto-update system | ~200KB |

**Everything else uses Electron built-ins:**
- `Tray`, `Menu`, `nativeImage` (system tray)
- `Notification` (desktop notifications)
- `app.setLoginItemSettings` (auto-start)

---

## Implementation Roadmap

```
Phase 1: Foundation (3-5 days)
├─ 1A. System Tray
├─ 1B. Desktop Notifications
└─ 1C. App/Window Tracking
        ↓
Phase 2: Focus Sessions (3-4 days)
        ↓
Phase 3: Onboarding (2-3 days) ← Can parallel with Phase 2
        ↓
Phase 4: Insights (4-5 days) ← Needs data from Phases 1+2
        ↓
Phase 5: Polish & Distribution (4-5 days)
```

**Total Estimated Effort:** 16-22 days for single developer

---

## Success Metrics

### Phase 1
- ✅ Tray icon visible in system tray
- ✅ Tray icon changes color based on energy level
- ✅ Desktop notifications appear for interventions
- ✅ App usage data logged to database
- ✅ Analytics page shows app usage breakdown

### Phase 2
- ✅ Focus timer counts down accurately
- ✅ Interruptions detected when switching to distracting apps
- ✅ Session history persisted to database
- ✅ Focus status shown in tray menu

### Phase 3
- ✅ First launch triggers onboarding wizard
- ✅ Subsequent launches skip onboarding
- ✅ Calibration banner shows during Week 1
- ✅ Settings saved from onboarding flow

### Phase 4
- ✅ Daily insights generated after 1+ day of usage
- ✅ Weekly patterns detected after 7+ days
- ✅ Context switch visualization shows real data
- ✅ Insights page renders without errors

### Phase 5
- ✅ Confetti fires on task completion
- ✅ Streak badge shows current count
- ✅ `npm run build:win` produces working installer
- ✅ Auto-start toggle works
- ✅ Auto-update checks for new versions

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| `active-win` ESM vs CommonJS | Use version 7.x (last CJS version) or dynamic `import()` wrapper |
| Native module packaging | `asarUnpack` config + existing `rebuild` script |
| macOS permissions for window tracking | Add permissions check UI (lower priority, Windows-first) |
| Tray icon DPI scaling | Generate icons at multiple sizes (16, 20, 24, 32) |
| Timer drift | Use absolute time (`Date.now() - startTime`) not decrementing counter |

---

## Beyond Phase 5: Future Considerations

**Not in initial scope but worth noting:**

- **Mobile companion app** (React Native) — view insights on phone
- **Team features** — shared insights for remote teams (controversial for privacy-first product)
- **Calendar integration** — auto-categorize meetings, detect schedule overload
- **Browser extension** — track web usage (requires separate privacy considerations)
- **ML model improvements** — personalized energy prediction beyond rule-based
- **macOS/Linux native builds** — currently Windows-first
- **Dark pattern detection** — warn when using apps designed to be addictive
- **Pomodoro variations** — Ultradian rhythms (90-120 min cycles)

---

## Getting Started

**Prerequisites:**
- Node.js 22+
- Python 3.13
- Visual Studio 2022 Build Tools (Windows)
- Git

**Development:**
```bash
# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Start dev server + Electron
npm run dev:full

# Or manually (two terminals):
npm run dev                     # Terminal 1: Vite
NODE_ENV=development npx electron .  # Terminal 2: Electron
```

**Building:**
```bash
npm run build:win    # Windows installer
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux AppImage
```

---

## Questions?

- **Architecture:** See `main/main.js` (central IPC hub), `src/App.tsx` (frontend shell)
- **Database:** See `main/database/migrations.js` (schema), `main/database/queries.js` (all queries)
- **Types:** See `src/types/flowstate.ts` (comprehensive TypeScript definitions)
- **Design System:** Tailwind config in `tailwind.config.js`, constants in `src/utils/constants.ts`

**Ready to start? Begin with Phase 1A (System Tray).**
