# Burnout Framework Demo Guide

## 🎭 Demo Mode Features

The Burnout Handling Framework now includes **5 realistic demo scenarios** to showcase different risk levels and intervention strategies without waiting for 4 weeks of real data.

---

## 🎬 Demo Scenarios

### Scenario 1: Medium Risk - Recovery Issues
**Composite Score:** ~0.47 (Medium Risk)
**Trend:** Deteriorating ↓
**Dominant Factors:**
- Recovery Deficit (0.58) - Breaks not restoring energy
- Overwork Patterns (0.52) - Long sessions, late nights

**Recommendations:**
- Improve break effectiveness
- Establish work boundaries
- Take longer breaks (15-20 min)
- Avoid work after 9 PM

**Use Case:** Demonstrates common burnout early warning - breaks becoming less effective

---

### Scenario 2: Low Risk - Healthy State
**Composite Score:** ~0.18 (Low Risk)
**Trend:** Stable →
**Dominant Factors:**
- All factors below 0.25
- Balanced work patterns

**Recommendations:**
- Maintain current habits
- Continue sustainable pace

**Use Case:** Shows what a healthy, sustainable work pattern looks like

---

### Scenario 3: High Risk - Multiple Factors
**Composite Score:** ~0.66 (High Risk)
**Trend:** Deteriorating ↓
**Dominant Factors:**
- Energy Variance Collapse (0.72) - Flattened energy
- Recovery Deficit (0.68) - Ineffective breaks
- Velocity Decline (0.65) - Performance dropping
- Overwork (0.58) - Unsustainable habits

**Recommendations:**
- Multiple interventions needed
- Address chronic fatigue
- Improve break quality
- Reduce workload temporarily
- Consider a rest day

**Use Case:** Demonstrates multiple risk factors compounding - needs urgent attention

---

### Scenario 4: Critical Risk - Intervention Needed
**Composite Score:** ~0.85 (Critical Risk)
**Trend:** Deteriorating ↓
**Dominant Factors:**
- ALL factors elevated (0.62 - 0.92)
- Severe across the board

**Recommendations:**
- 🚨 **IMMEDIATE INTERVENTION REQUIRED**
- Take 2-3 days off
- Discuss workload with manager
- Seek professional support if needed
- All component-specific recommendations

**Use Case:** Shows critical burnout state requiring immediate action

---

### Scenario 5: Medium Risk - Recovering
**Composite Score:** ~0.39 (Medium Risk)
**Trend:** Recovering ↑
**Dominant Factors:**
- Velocity Decline (0.45) - Still elevated but improving
- Variance Collapse (0.42) - Energy stabilizing

**Recommendations:**
- Continue recovery practices
- Maintain lighter workload
- Build confidence gradually

**Use Case:** Demonstrates recovery trajectory - interventions working

---

## 🎮 How to Use Demo Mode

### Step 1: Open Analytics Page
Navigate to **Analytics** in the employee app

### Step 2: View Demo Data
The Burnout Risk Assessment section automatically shows **Scenario 1** (Medium Risk) in demo mode

### Step 3: Cycle Through Scenarios
Click **"Next Scenario"** button in the blue demo banner to cycle through all 5 scenarios:
- Click 1: Scenario 2 (Low Risk - Healthy)
- Click 2: Scenario 3 (High Risk - Multiple Factors)
- Click 3: Scenario 4 (Critical - Intervention Needed)
- Click 4: Scenario 5 (Medium Risk - Recovering)
- Click 5: Back to Scenario 1 (Medium Risk - Recovery Issues)

### Step 4: Expand Details
Click **"Show component breakdown"** to see:
- Individual risk factor scores
- Visual progress bars for each component
- Color-coded severity levels

### Step 5: Review Recommendations
Scroll to the **Recommendations** panel to see:
- Priority-based intervention suggestions
- Actionable steps for each dominant factor
- Context-specific guidance

### Step 6: Switch to Real Data
Click **"Try Real Data"** to see the actual burnout analysis based on your 4 weeks of collected data
- If insufficient data: Will still show demo with a fallback message
- If sufficient data: Will display real analysis

---

## 🎨 Visual Features

### Risk Level Colors
- 🟢 **Green (0.00-0.35):** Low Risk - Normal fluctuations
- 🟠 **Orange (0.35-0.60):** Medium Risk - Emerging strain
- 🔴 **Red (0.60-0.80):** High Risk - Sustained overload
- 🔴 **Dark Red (0.80-1.00):** Critical - Immediate intervention

### Trend Indicators
- ↓ **Deteriorating:** Red downward arrow
- ↑ **Recovering:** Green upward arrow
- → **Stable:** Blue horizontal line

### Component Icons
- ⚡ **Velocity:** Target icon
- 🔋 **Recovery:** Battery icon
- 📊 **Variance:** Activity wave icon
- ⏰ **Overwork:** Clock icon
- 🎯 **Quality-Pace:** Zap icon
- 🎪 **Avoidance:** Alert triangle icon

---

## 📊 Understanding the Scores

### Component Scores (0.00 - 1.00)
Each of the 6 risk factors is normalized to a 0-1 scale:
- **0.00-0.35:** Low concern (green)
- **0.35-0.60:** Moderate concern (orange)
- **0.60-1.00:** High concern (red)

### Composite Score Calculation
```
Composite =
  (Velocity × 0.25) +
  (Recovery × 0.25) +
  (Variance × 0.20) +
  (Overwork × 0.15) +
  (Quality-Pace × 0.10) +
  (Avoidance × 0.05)
```

The composite score determines the overall risk level.

---

## 💡 Teaching Use Cases

### For Employees
- **Learn warning signs:** Recognize early burnout indicators
- **Understand interventions:** See what actions help at different risk levels
- **Plan prevention:** Know when to take breaks, adjust workload
- **Track recovery:** Monitor progress from high → medium → low risk

### For Managers
- **Team awareness:** Understand what employees experience
- **Intervention timing:** Know when to step in
- **Workload planning:** Recognize unsustainable patterns
- **Support strategies:** Learn effective recommendations

### For Product Demos
- **Quick overview:** Show all risk levels in 2 minutes
- **Feature showcase:** Demonstrate analytics depth
- **Recommendation engine:** Highlight personalized interventions
- **Visual design:** Show polished UI with real-seeming data

---

## 🔄 Toggling Between Demo and Real

### Starting State
- App **starts in demo mode** by default
- Shows Scenario 1 automatically
- Blue banner indicates demo mode

### Switching to Real Data
1. Click **"Try Real Data"** button
2. System checks for 4 weeks of collected data
3. **If sufficient:** Shows real burnout analysis
4. **If insufficient:** Falls back to demo with notice

### Returning to Demo
1. Click **"Show Demo"** button (appears when in real mode)
2. Returns to Scenario 1
3. Blue demo banner reappears

---

## 🎓 Best Practices for Demo

### For Testing
1. Start with Scenario 1 to see typical medium risk
2. Jump to Scenario 4 (Critical) to see maximum recommendations
3. Compare Scenario 2 (Healthy) vs Scenario 3 (High Risk)
4. Use Scenario 5 to understand recovery trajectory

### For Presentations
1. Show Scenario 2 first (Healthy) as baseline
2. Progress to Scenario 1 or 3 (Medium/High)
3. Highlight recommendations panel
4. End with Scenario 5 (Recovery) to show hope

### For Development
- Demo mode allows UI iteration without waiting for data
- Test recommendation engine with different factor combinations
- Verify color coding and visual hierarchy
- Validate responsive design at different screen sizes

---

## 🚀 Next Steps After Demo

1. **Collect Real Data:** Wait 4 weeks for actual analysis
2. **Compare:** See how demo scenarios match real patterns
3. **Adjust Thresholds:** Fine-tune based on user feedback
4. **Extend Scenarios:** Add more specific cases (e.g., weekend recovery)

---

## 📝 Technical Notes

### Demo Data Persistence
- Demo scenarios are **not stored** in database
- Generated fresh on each request
- No impact on real data collection

### Performance
- Demo generation is instant (<1ms)
- No database queries required
- Ideal for offline demos

### Customization
Add new scenarios by editing `getDemoScenarios()` in `burnout-analyzer.js`

---

**Happy Testing!** 🎉

The demo mode makes it easy to showcase the Burnout Handling Framework without waiting for weeks of data collection.
