# Burnout Risk Heatmap

## ✅ Implementation Complete

### What It Does
Displays a red-colored heatmap showing burnout risk levels for each hour of each day over the past week. Dark red indicates high stress/burnout risk, light red shows moderate risk, and gray means no risk.

---

## 🎨 Visual Design

### Color Scale (Red Gradient)
- **No risk** (0%): `rgb(30, 41, 59)` - Dark gray
- **Very low** (1-20%): `rgba(239, 68, 68, 0.25)` - Very light red
- **Low** (21-35%): `rgba(239, 68, 68, 0.4)` - Light red
- **Medium-low** (36-50%): `rgba(239, 68, 68, 0.55)` - Medium-light red
- **Medium** (51-65%): `rgba(239, 68, 68, 0.7)` - Medium red
- **High** (66-80%): `rgba(239, 68, 68, 0.85)` - Dark red
- **Critical** (81-100%): `rgb(239, 68, 68)` - Darkest red

---

## 📊 Demo Data Patterns

### Weekday Burnout Indicators

**Very Early Morning (5-6 AM)** 🔴 Medium Risk (40-55%)
- Working too early
- Risk increases through the week (Mon: 40%, Fri: 55%)
- Indicates poor sleep/work balance

**Normal Work Hours (9 AM - 5 PM)** 🟠 Low-Medium Risk (25-50%)
- Baseline work stress
- Increases throughout the week
- Lunch hours (1-2 PM): Lower risk (15%)

**Late Evening (8-10 PM)** 🔴 High Risk (60-90%)
- Overwork pattern
- Critical by Thursday/Friday (85-90%)
- Indicates no work-life boundaries

**Late Night (11 PM - 1 AM)** 🔴 Critical Risk (85-100%)
- Wednesday onwards only
- Extreme burnout indicator
- Unsustainable work pattern

### Weekend Patterns

**Saturday Evening (2-6 PM)** 🔴 Medium-High Risk (50-65%)
- Weekend work = burnout
- Should be rest time

**Saturday Late Night (10 PM - 2 AM)** 🔴 High Risk (70-90%)
- Critical stress indicator
- No recovery time

**Sunday Evening (7-10 PM)** 🔴 Medium Risk (55-65%)
- "Sunday anxiety"
- Dreading Monday

---

## 🎯 Prototype Demonstration Pattern

```
Time    Mon    Tue    Wed    Thu    Fri    Sat    Sun
────────────────────────────────────────────────────────
00:00   ⬛     ⬛     🔴     🔴     🔴     🔴     ⬛     Critical if working
01:00   ⬛     ⬛     🔴     🔴     🔴     🔴     ⬛
05:00   🟠     🟠     🟠     🔴     🔴     ⬛     ⬛     Too early
06:00   🟠     🟠     🟠     🔴     🔴     ⬛     ⬛
09:00   🟠     🟠     🟠     🔴     🔴     ⬛     ⬛     Normal work
10:00   🟠     🟠     🟠     🔴     🔴     ⬛     ⬛
13:00   🟢     🟢     🟢     🟢     🟢     ⬛     ⬛     Lunch - low risk
14:00   🟢     🟢     🟢     🟢     🟢     🟠     ⬛
20:00   🔴     🔴     🔴     🔴     🔴     🔴     ⬛     Late work
21:00   🔴     🔴     🔴     🔴     🔴     🔴     🟠     High burnout
22:00   ⬛     ⬛     🔴     🔴     🔴     🔴     🟠     Critical
23:00   ⬛     ⬛     🔴     🔴     🔴     🔴     ⬛
```

**Legend:**
- ⬛ Gray = No risk
- 🟢 Light red = Low risk (15-25%)
- 🟠 Medium red = Medium risk (40-55%)
- 🔴 Dark red = High/Critical risk (60-100%)

---

## 💡 Key Insights (For Demo)

### Point 1: Weekday Burnout Progression
> "Notice how the weekday columns get darker as the week progresses. By Friday, even normal work hours show higher burnout risk. This indicates cumulative weekly fatigue."

### Point 2: Late Night Critical Risk
> "These dark red blocks at 11 PM - 1 AM on Wed-Fri are critical burnout indicators. Working past midnight shows unsustainable patterns."

### Point 3: Weekend Work Warning
> "Saturday evening and late night showing red means no recovery time. Weekends should be gray (rest)."

### Point 4: Early Morning Stress
> "Working at 5-6 AM consistently indicates sleep deprivation and poor work-life balance."

### Point 5: Lunch Break Protection
> "See the lighter colors at 1-2 PM? Taking proper lunch breaks reduces burnout risk."

---

## 🔧 Technical Details

### Backend Query
```javascript
const getWeeklyBurnoutHeatmap = () => {
  // Returns 168 records (7 days × 24 hours)
  // Each with: day, date, hour, risk (0-100)
  // Risk calculated from: 100 - avg_energy_score
}
```

### Demo Data Logic
```javascript
// Weekday patterns:
- Early AM (5-6): 40-55% risk (increasing through week)
- Work hours (9-5): 25-50% risk (increasing through week)
- Late evening (8-10 PM): 60-90% risk (critical by Fri)
- Late night (11 PM-1 AM): 85-100% risk (Wed onwards)

// Weekend patterns:
- Saturday work: 50-90% risk
- Sunday evening: 55-65% risk (Sunday anxiety)
```

---

## 📍 Location in App

**Analytics → This Week → Burnout Risk Heatmap Card**
- Appears below the Focus Hours heatmap
- Only visible in "This Week" view
- Shows warning message below the grid

---

## ⚠️ Warning Message

The heatmap includes an insight box:
```
⚠️ Warning: Dark red blocks indicate high burnout risk.
Late-night work and weekend activity suggest unhealthy work patterns.
```

---

## 🎨 Color Psychology

**Why Red?**
- Red universally signals danger/warning
- High contrast with blue focus heatmap
- Immediately draws attention to problem areas
- Creates emotional response to take action

**Gradient Effect:**
- Smooth transition shows severity levels
- Easy to spot critical areas (darkest red)
- Light red = caution, dark red = urgent action needed

---

## 📊 Comparison with Focus Heatmap

| Feature | Focus Heatmap | Burnout Heatmap |
|---------|---------------|-----------------|
| **Color** | Blue gradient | Red gradient |
| **Metric** | Focus minutes (0-60) | Burnout risk % (0-100) |
| **Goal** | More is better | Less is better |
| **Dark blocks** | High productivity ✅ | High burnout ⚠️ |
| **Light blocks** | Low activity | Low risk |
| **Pattern** | Concentrate work | Avoid overwork |

---

## 🔍 Pattern Analysis Examples

### Healthy Pattern (Goal)
```
        Mon  Tue  Wed  Thu  Fri  Sat  Sun
09-17   🟢   🟢   🟢   🟢   🟢   ⬛   ⬛   Low risk work hours
18-23   ⬛   ⬛   ⬛   ⬛   ⬛   ⬛   ⬛   No late work
Weekend ⬛   ⬛   ⬛   ⬛   ⬛   ⬛   ⬛   Full rest
```

### Warning Pattern (Current Demo)
```
        Mon  Tue  Wed  Thu  Fri  Sat  Sun
09-17   🟠   🟠   🟠   🔴   🔴   ⬛   ⬛   Increasing stress
20-22   🔴   🔴   🔴   🔴   🔴   🔴   🟠   Late work
23-01   ⬛   ⬛   🔴   🔴   🔴   🔴   ⬛   Critical
Weekend ⬛   ⬛   ⬛   ⬛   ⬛   🔴   🟠   No rest!
```

### Critical Pattern (Extreme Case)
```
All blocks red = Immediate intervention needed
```

---

## 💼 Use Cases

### For Individual Users
- **Self-awareness**: Visualize unhealthy work patterns
- **Early warning**: Spot burnout before it's severe
- **Behavior change**: Motivate better work-life balance
- **Progress tracking**: See improvement over time

### For Managers
- **Team health**: Monitor employee wellbeing
- **Intervention**: Identify who needs support
- **Policy**: Adjust deadlines/workload
- **Culture**: Promote healthy work habits

---

## 🚀 How to Test

1. **Open FlowState app**
2. **Go to Analytics**
3. **Click "This Week" tab**
4. **Scroll down** to "Burnout Risk Heatmap"
5. **Hover over cells** to see exact risk %
6. **Look for patterns**:
   - Late-night dark red (Wed-Fri)
   - Weekend work (Saturday)
   - Increasing darkness Mon→Fri

---

## 📈 Expected Demo Output

**High Risk Hours (Dark Red):**
- Wed-Fri 11 PM - 1 AM: 85-100%
- Thu-Fri 8-10 PM: 85-90%
- Saturday 10 PM - 2 AM: 70-90%

**Medium Risk (Medium Red):**
- Weekday 5-6 AM: 40-55%
- Friday work hours: 50%
- Saturday afternoon: 50-65%
- Sunday evening: 55-65%

**Low Risk (Light Red):**
- Mon-Wed work hours: 25-35%
- Lunch breaks: 15%

**No Risk (Gray):**
- Night hours (sleep)
- Most of Sunday
- Early weekend mornings

---

## 🎓 Educational Value

This heatmap teaches users:
1. **Burnout is gradual** - builds up through the week
2. **Recovery is essential** - weekends should be gray
3. **Late work is costly** - highest risk hours
4. **Breaks matter** - lunch shows lower risk
5. **Patterns are visible** - data makes invisible visible

---

**Created**: February 15, 2026
**Status**: ✅ Fully Implemented
**Color**: Red gradient (warning theme)
**Data**: Realistic burnout demo patterns
**Ready**: For prototype demonstration!
