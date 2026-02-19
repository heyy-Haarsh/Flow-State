# Smart Session Features Implementation

## ✅ Implemented Features

### 1. Accurate System Time Detection
### 2. Smart Session Duration Suggestions

---

## 🕐 Feature 1: Accurate System Time Detection

### What It Does
Provides precise system time information with timezone awareness for accurate analytics and scheduling.

### Implementation
- **Service**: `session-advisor.js` → `getAccurateSystemTime()`
- **IPC Handler**: `get-system-time`
- **Preload**: `window.electron.getSystemTime()`

### Data Provided
```javascript
{
  timestamp: "2026-02-15T02:30:00.000Z",    // ISO 8601 format
  localTime: "2:30:00 AM",                   // Human-readable local time
  localDate: "2/15/2026",                    // Local date
  hour: 2,                                   // Current hour (0-23)
  minute: 30,                                // Current minute
  second: 0,                                 // Current second
  dayOfWeek: 6,                              // Day (0=Sunday, 6=Saturday)
  timezone: "Asia/Kolkata",                  // IANA timezone
  timezoneOffset: -330,                      // Minutes from UTC
  unixTimestamp: 1739578200                  // Unix epoch time
}
```

### Use Cases
- **Circadian Rhythm Analysis**: Track energy patterns by accurate time of day
- **Peak Hours Detection**: Identify optimal work hours
- **Session Scheduling**: Schedule breaks and sessions based on time
- **Analytics**: Timestamp all events with timezone info
- **Cross-timezone Collaboration**: Handle distributed teams

---

## 🎯 Feature 2: Smart Session Duration Suggestions

### What It Does
Analyzes your past focus sessions to suggest the optimal session duration based on:
- Historical completion rates
- Time of day patterns
- Current energy levels
- Day of week trends
- Recent success rates

### How It Works

#### Analysis Algorithm
1. **Fetch Recent Sessions** (last 30 completed sessions)
2. **Calculate Patterns**:
   - Average duration across all sessions
   - Success rate by duration (15/25/45/60/90 min)
   - Time-of-day performance (±1 hour window)
   - Completion rates by duration buckets

3. **Apply Context**:
   - Current energy level (from monitoring)
   - Time of day category (morning/afternoon/evening)
   - Historical performance at this hour

4. **Generate Suggestion**:
   - Recommended duration (15/25/45/60/90 min)
   - Confidence level (low/medium/high)
   - Reasoning (why this duration)
   - Alternative options

#### Confidence Levels
- **High**: 10+ sessions at this time, clear pattern
- **Medium**: 5-9 sessions, emerging pattern
- **Low**: <5 sessions, using defaults

### UI Display

#### Smart Recommendation Card
```
┌─────────────────────────────────────────────┐
│ 💡 Recommended: 45 min         🕐 2:30 AM  │
│                                              │
│ • You typically work 45 min at this hour    │
│ • High energy detected → longer session     │
│                                              │
│ Based on 15 past sessions (80% completion)  │
└─────────────────────────────────────────────┘
```

#### Duration Buttons
- **Blue dot indicator** on recommended duration
- Auto-selects suggested duration on page load
- User can override with manual selection

---

## 📊 Smart Suggestion Logic

### Default Suggestions (New Users)
When you have <3 sessions, the system uses intelligent defaults:

| Time of Day | Suggested Duration | Reasoning |
|-------------|-------------------|-----------|
| 9-11 AM | 60 min | Morning peak hours |
| 2-4 PM | 25 min | Post-lunch energy dip |
| Other times | 45 min | Standard productivity session |

### Behavioral Analysis (Experienced Users)
After 3+ sessions, the system:

1. **Finds Optimal Duration**:
   - Groups sessions by duration
   - Calculates completion rate for each
   - Selects duration with highest success rate
   - Requires minimum 3 samples for confidence

2. **Adjusts for Time of Day**:
   - Finds sessions within ±1 hour window
   - Calculates average duration at this time
   - Blends with optimal duration

3. **Energy-Based Adjustment**:
   - Low energy (<40): Cap at 25 min
   - High energy (>70): Minimum 45 min
   - Medium energy: No adjustment

4. **Rounds to Common Intervals**:
   - Always suggests: 15, 25, 45, 60, or 90 min
   - Never suggests odd durations like 37 or 53 min

---

## 🎓 Example Scenarios

### Scenario 1: New User (First Session)
```javascript
{
  suggestedDuration: 45,
  confidence: 'low',
  reasons: ['Standard productivity session length'],
  isFirstTime: true,
  stats: {
    totalSessions: 0,
    completionRate: 0
  }
}
```

### Scenario 2: Morning Peak Pattern
```javascript
{
  suggestedDuration: 60,
  confidence: 'high',
  reasons: [
    'You typically work 60 min at this hour',
    'High energy detected → longer session possible'
  ],
  stats: {
    averageDuration: 58,
    totalSessions: 12,
    completionRate: 85,
    bestTimeOfDay: 'morning'
  }
}
```

### Scenario 3: Post-Lunch Dip
```javascript
{
  suggestedDuration: 25,
  confidence: 'medium',
  reasons: [
    'You typically work 25 min at this hour',
    'Current low energy → shorter session recommended'
  ],
  stats: {
    averageDuration: 27,
    totalSessions: 6,
    completionRate: 70,
    bestTimeOfDay: 'midday'
  }
}
```

### Scenario 4: Evening Focus
```javascript
{
  suggestedDuration: 45,
  confidence: 'high',
  reasons: [
    'You typically work 45 min at this hour'
  ],
  alternativeDurations: [25, 60, 90],
  stats: {
    averageDuration: 46,
    totalSessions: 18,
    completionRate: 82,
    bestTimeOfDay: 'evening',
    currentEnergy: 65
  }
}
```

---

## 📁 Files Created/Modified

### New Files
1. **`main/services/session-advisor.js`** - Smart suggestion engine

### Modified Files
1. **`main/main.js`** - Added IPC handlers:
   - `get-suggested-duration`
   - `get-system-time`

2. **`main/preload.js`** - Exposed methods:
   - `getSuggestedDuration()`
   - `getSystemTime()`

3. **`src/components/FocusSessions/FocusTimer.tsx`** - Added:
   - Smart recommendation card
   - System time display
   - Auto-selection of suggested duration
   - Blue dot indicator on recommended option

---

## 🎮 How to Use

### For Users

1. **Navigate to Focus Timer**
2. **See Recommendation Card** (blue background):
   - Suggested duration (e.g., "45 min")
   - Current time displayed
   - Reasons why it's recommended
   - Your historical stats

3. **Accept or Override**:
   - The suggested duration is pre-selected
   - Click any other duration button to override
   - Blue dot marks the recommended option

4. **Click "Start Focus Session"**

### For Developers

#### Get Smart Suggestion
```javascript
const suggestion = await window.electron.getSuggestedDuration();
console.log(suggestion);
// {
//   suggestedDuration: 45,
//   confidence: 'high',
//   reasons: [...],
//   stats: {...}
// }
```

#### Get System Time
```javascript
const time = await window.electron.getSystemTime();
console.log(time);
// {
//   timestamp: "2026-02-15T02:30:00.000Z",
//   localTime: "2:30 AM",
//   hour: 2,
//   timezone: "Asia/Kolkata"
// }
```

---

## 🔍 Analytics Integration

The system time and session patterns are now used across:

1. **Burnout Detection**: Time-of-day stress patterns
2. **Peak Hours**: Optimal working hours identification
3. **Energy Tracking**: Circadian rhythm analysis
4. **ML Pipeline**: Time-based feature engineering
5. **Intervention Timing**: Schedule breaks optimally

---

## 🚀 Future Enhancements

### Planned Features
1. **Day-of-Week Patterns**: Monday vs Friday behavior
2. **Task Complexity Matching**: Suggest longer sessions for complex tasks
3. **Weather Integration**: Adjust for seasonal affective patterns
4. **Meeting Schedule Sync**: Avoid suggesting sessions before meetings
5. **Break Reminders**: Suggest break timing based on past patterns
6. **Collaborative Sessions**: Sync with team availability

### Machine Learning
- Train ML model on session success predictors
- Personalized duration curves
- Predict optimal session start times
- Recommend session types (deep work vs shallow work)

---

## 💡 Benefits

### For Productivity
- **Higher Completion Rates**: Sessions matched to your capacity
- **Less Decision Fatigue**: Smart defaults reduce choices
- **Personalized Experience**: Learns your unique patterns
- **Time-Aware**: Respects your circadian rhythm

### For Wellbeing
- **Prevents Overwork**: Suggests shorter sessions when tired
- **Optimizes Recovery**: Matches energy levels
- **Sustainable Habits**: Builds on what works for you
- **Reduces Burnout**: Avoids pushing beyond capacity

---

## 📈 Metrics Tracked

The system continuously learns from:
- Session duration chosen
- Completion rate (completed vs ended early)
- Time of day started
- Day of week
- Energy level at start
- Task complexity
- Pauses and interruptions
- Actual vs planned duration

---

**Created**: February 15, 2026
**Status**: ✅ Fully Implemented
**Ready**: For immediate use!
