# Prototype Heatmap - Synthetic Data Pattern

## 📊 Visual Preview

This shows the realistic study/work pattern generated for prototype demonstration:

```
Time    Mon    Tue    Wed    Thu    Fri    Sat    Sun
────────────────────────────────────────────────────────
00:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛
01:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛
02:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛
03:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛
04:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛
05:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛
06:00   🔷     🔷     🔷     🔷     🔷     ⬛     ⬛     Early morning (10-20 min) - LIGHT
07:00   🔷     🔷     🔷     🔷     🔷     ⬛     ⬛     Early morning (10-20 min) - LIGHT
08:00   🔵     🔵     🔵     🔵     🔵     ⬛     ⬛     Getting started (35-45 min) - MEDIUM
09:00   🟦     🟦     🟦     🟦     🟦     ⬛     ⬛     Peak morning (50-65 min) - VERY DARK
10:00   🟦     🟦     🟦     🟦     🟦     🟦     ⬛     Peak focus (50-65 min) - VERY DARK
11:00   🟦     🟦     🟦     🟦     🟦     🟦     ⬛     Peak focus (50-65 min) - VERY DARK
12:00   🔵     🔵     🔵     🔵     🔵     🟦     ⬛     Pre-lunch (35-45 min) - MEDIUM
13:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     Lunch break - NO ACTIVITY
14:00   ⬛     ⬛     ⬛     ⬛     ⬛     🔵     ⬛     Lunch break - NO ACTIVITY
15:00   🟦     🟦     🔵     🟦     🟦     🔵     🔵     Afternoon session (40-60 min) - DARK
16:00   🟦     🟦     🔵     🟦     🟦     🔵     🔵     Afternoon session (40-60 min) - DARK
17:00   🟦     🟦     🔵     🟦     🟦     ⬛     🔵     Afternoon session (40-60 min) - DARK
18:00   ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     ⬛     End of workday
19:00   🟦     🟦     🟦     🔵     🔵     ⬛     ⬛     Evening study (60→30 min)
20:00   🟦     🟦     🔵     🔵     🔷     ⬛     ⬛     Evening study (decreasing)
21:00   🟦     🔵     🔵     🔷     🔷     ⬛     ⬛     Evening study (decreasing)
22:00   🔷     🔷     🔷     ⬛     ⬛     ⬛     ⬛     Late night cramming (15-30 min)
23:00   🔷     🔷     🔷     ⬛     ⬛     ⬛     ⬛     Late night cramming (15-30 min)
```

**Legend:**
- 🟦 **Very Dark Blue** = 50-65 minutes (HIGH FOCUS)
- 🔵 **Medium Blue** = 35-45 minutes (GOOD FOCUS)
- 🔷 **Light Blue** = 10-30 minutes (LOW FOCUS)
- ⬛ **Gray** = 0 minutes (NO ACTIVITY)

---

## 🎯 Intensity Examples (For Demo)

### 1. **Full Hour Study** (60 minutes) = 🟦 VERY DARK BLUE
**When:** Monday-Friday 9-11 AM (Peak morning hours)
```
09:00   🟦  🟦  🟦  🟦  🟦    ← 50-65 min each
10:00   🟦  🟦  🟦  🟦  🟦    ← Nearly full hour
11:00   🟦  🟦  🟦  🟦  🟦    ← Maximum focus
```

### 2. **Half Hour Study** (30-40 minutes) = 🔵 MEDIUM BLUE
**When:** Afternoon sessions (3-5 PM)
```
15:00   🟦  🟦  🔵  🟦  🟦    ← Wed lighter (35 min)
16:00   🟦  🟦  🔵  🟦  🟦    ← Medium intensity
```

### 3. **Short Study** (10-20 minutes) = 🔷 LIGHT BLUE
**When:** Early morning (6-7 AM), Late night (10-11 PM)
```
06:00   🔷  🔷  🔷  🔷  🔷    ← Quick morning review
22:00   🔷  🔷  🔷  ⬛  ⬛    ← Late night cramming
```

### 4. **No Study** (0 minutes) = ⬛ GRAY
**When:** Night hours, Lunch break, Sunday
```
01:00   ⬛  ⬛  ⬛  ⬛  ⬛    ← Sleeping
13:00   ⬛  ⬛  ⬛  ⬛  ⬛    ← Lunch break
```

---

## 📅 Weekly Pattern Story

### **Monday - Thursday** (Strong Weekdays)
- **6-7 AM**: Light morning routine (10-20 min) 🔷
- **8 AM**: Getting started (35-45 min) 🔵
- **9-11 AM**: **PEAK PRODUCTIVITY** (50-65 min) 🟦 ← **DARKEST BLOCKS**
- **12 PM**: Pre-lunch wind down (35-45 min) 🔵
- **1-2 PM**: Lunch break (0 min) ⬛
- **3-5 PM**: Afternoon deep work (40-60 min) 🟦
- **7-9 PM**: Evening study (decreasing Mon→Thu)
- **10-11 PM**: Late night cramming (Mon-Wed only) 🔷

### **Friday** (Wind Down)
- Similar morning pattern (9-11 AM still dark) 🟦
- Lighter afternoon and evening
- No late-night sessions
- Shows work-life balance

### **Saturday** (Weekend Work)
- Late start (10 AM)
- **10-12 PM**: Good focus (40-60 min) 🟦
- **2-4 PM**: Medium focus (25-45 min) 🔵
- No early morning or late night

### **Sunday** (Rest Day)
- Minimal activity
- **3-5 PM only**: Light review (20-35 min) 🔷
- Mostly gray (rest)

---

## 🎨 Color Intensity Breakdown

### Minutes → Color Mapping

| Minutes    | Color                        | Shade     | Example Hours         |
|------------|------------------------------|-----------|----------------------|
| **0**      | `rgb(30, 41, 59)` Gray       | ⬛        | Night, lunch, rest   |
| **1-14**   | `rgba(59,130,246,0.2)` 20%   | 🔷 Faint  | Quick check-ins      |
| **15-29**  | `rgba(59,130,246,0.4)` 40%   | 🔷 Light  | Morning routine      |
| **30-44**  | `rgba(59,130,246,0.6)` 60%   | 🔵 Medium | Good sessions        |
| **45-59**  | `rgba(59,130,246,0.8)` 80%   | 🔵 Dark   | Strong focus         |
| **60+**    | `rgb(59,130,246)` 100%       | 🟦 Darkest| **Peak productivity**|

---

## 💡 Prototype Demonstration Script

### **Show Color Range:**

1. **Point to Morning Peak (9-11 AM):**
   > "See these dark blue blocks? This person studied for nearly the full hour - 50 to 65 minutes of deep focus. This is peak productivity time."

2. **Point to Early Morning (6-7 AM):**
   > "These light blue blocks show quick 10-20 minute sessions - maybe reviewing notes before breakfast."

3. **Point to Lunch Break (1-2 PM):**
   > "Gray blocks mean no activity. Healthy break time!"

4. **Point to Wednesday Afternoon Dip:**
   > "Notice Wednesday afternoon is lighter? Mid-week fatigue is normal. The heatmap helps identify these patterns."

5. **Point to Evening Progression:**
   > "Watch the evening pattern - dark blue Monday, gradually lighter by Friday. Shows weekly fatigue buildup."

6. **Point to Weekend:**
   > "Saturday has some focus time, Sunday is mostly rest. Balanced lifestyle!"

### **Highlight Full Range:**
```
"The heatmap shows everything from:
- ⬛ No study (gray)
- 🔷 Quick 10-min reviews (light blue)
- 🔵 Half-hour sessions (medium blue)
- 🟦 Full hour deep work (dark blue)

All at a glance!"
```

---

## 📊 Key Metrics to Mention

### Total Weekly Focus Time
- **Monday-Friday**: ~240 minutes/day average
- **Saturday**: ~120 minutes
- **Sunday**: ~50 minutes
- **Weekly Total**: ~1,370 minutes (22.8 hours)

### Peak Hours Identified
- **Best time**: 9-11 AM (weekdays)
- **Secondary peak**: 3-5 PM (Mon, Tue, Thu, Fri)
- **Avoid scheduling**: 1-2 PM (lunch dip)

### Work-Life Balance Score
- **Healthy weekend rest**: ✅ Sunday mostly clear
- **Evening wind-down**: ✅ Lighter by Friday
- **No all-nighters**: ✅ Clear after 11 PM

---

## 🚀 How to View in Prototype

1. **Open FlowState app**
2. **Navigate to Analytics**
3. **Click "This Week" tab**
4. **Scroll to "Weekly Focus Heatmap" card**
5. **Hover over cells** to see exact minutes
6. **Point out patterns** using the story above

---

## 🎓 Educational Insights (For Presentation)

### Pattern Analysis

**Monday Morning (9 AM):**
- Hover shows: "55 minutes"
- Explanation: "Peak productivity - full hour of deep focus"

**Wednesday Afternoon (3 PM):**
- Hover shows: "28 minutes"
- Explanation: "Mid-week dip - shorter, lighter session"

**Friday Evening (8 PM):**
- Hover shows: "18 minutes"
- Explanation: "Winding down for the weekend"

**Sunday (most hours):**
- Hover shows: "No activity"
- Explanation: "Rest day - important for recovery"

---

## 🔄 Data Refresh

**When does it update?**
- Currently showing **demo data** (labeled at bottom)
- Once you complete real focus sessions, it switches to **real data**
- Updates **every time you view Analytics**
- No demo label when using real data

**How to test with real data:**
1. Start a focus session (any duration)
2. Complete it
3. Return to Analytics → This Week
4. See your actual pattern appear!

---

**Created**: February 15, 2026
**Purpose**: Prototype demonstration guide
**Data Type**: Realistic synthetic study patterns
**Shows**: Full color range from 0-60+ minutes
