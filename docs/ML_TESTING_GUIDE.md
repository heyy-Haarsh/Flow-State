# FlowState ML Models - Testing Guide

## How to Verify All 3 Models Are Working (Not Using Fallback)

With the new diagnostic logging, you can easily verify that each model is using **ML predictions** (not rule-based fallback).

---

## 1. Energy Model Testing

### What It Does
Predicts your cognitive energy level (0-100) based on:
- Typing speed (kpm)
- Error rate
- Session duration
- Time since last break
- Questionnaire responses (sleep, stress, focus level)
- Time of day + day of week

### How to Test

1. **Look for this log every 60 seconds:**
   ```
   [MLPipeline] ✓ Energy: ML raw=67.3, smoothed=65 (using ML model)
   ```
   
   **If using ML:** ✅ Shows "using ML model"  
   **If using fallback:** ⚠️ Shows "ML failed" or "ML not loaded"

2. **Verify smoothing is working:**
   - Energy should change gradually (not jump from 70 → 40 instantly)
   - Max change per minute: ±3-5 points
   - Smoothing uses EMA (α=0.25)

3. **Test different scenarios:**
   - **Morning (fresh):** Energy should be 70-80
   - **After 2 hours of work:** Energy should drop to 50-60
   - **High error rate:** Energy should be lower
   - **After filling questionnaire (good sleep):** Energy should boost

### Expected Output
```
[MLPipeline] Energy: raw=67, smoothed=65, delta=0.8, maxDelta=5.0
[MLPipeline] ✓ Energy: ML raw=67.3, smoothed=65 (using ML model)
```

---

## 2. Break Suggestion Model Testing

### What It Does
Predicts whether you need a break based on:
- **Predicted energy** (from Model #1)
- Session duration
- Time since last break
- Error rate vs baseline
- Keyboard velocity
- Mouse activity
- Recent break suggestion history
- Task complexity

### How to Test

1. **Trigger a break suggestion:**
   - Work for **60+ minutes** without taking a break
   - Keep energy moderate (50-65)
   - Make some typos (error rate > 5%)

2. **Look for this log:**
   ```
   [MLPipeline] ✓ Break: ML prob=75.3%, threshold=45.9% → SUGGEST
   ```
   
   **If using ML:** ✅ Shows "ML prob=..."  
   **If using fallback:** ⚠️ Shows "ML failed, using rule-based fallback"

3. **Verify the threshold:**
   - **Threshold = 45.9%** (from training)
   - If probability > 45.9% → suggest break
   - If probability < 45.9% → no break

4. **Test different scenarios:**

   | Scenario | Expected Probability | Should Suggest? |
   |---|---|---|
   | Fresh start (10 min in) | ~10-20% | NO |
   | 60 min, energy=65, low errors | ~30-40% | NO |
   | 60 min, energy=55, moderate errors | ~50-65% | **YES** |
   | 90 min, energy=45, high errors | ~75-85% | **YES** |

### Expected Output (when suggesting)
```
[MLPipeline] ✓ Break: ML prob=68.5%, threshold=45.9% → SUGGEST
[InterventionEngine] Break type: 🚶 Movement Break (You've been sitting for a while...)
```

### Expected Output (when NOT suggesting)
```
[MLPipeline] ✓ Break: ML prob=22.1%, threshold=45.9% → NO
```

---

## 3. Task Switch Model Testing

### What It Does
Predicts whether you should switch to an easier task based on:
- **Predicted energy** (from Model #1)
- **Break suggestion probability** (from Model #2)
- Current task complexity (low/medium/high)
- Error rate
- Time on current task
- Recent task switches
- Task dependencies
- Deep work indicators

### How to Test

1. **Set up the scenario:**
   - Create a task with **high complexity** in the task manager
   - Activate that task
   - Work for 45+ minutes
   - Keep energy moderate (50-60)
   - Make typos (error rate > 8%)

2. **Look for this log:**
   ```
   [MLPipeline] ✓ TaskSwitch: ML prob=72.4%, threshold=65.5% → SUGGEST
   ```
   
   **If using ML:** ✅ Shows "ML prob=..."  
   **If using fallback:** ⚠️ Shows "ML failed, using rule-based fallback"

3. **Verify the threshold:**
   - **Threshold = 65.5%** (from training)
   - If probability > 65.5% → suggest switch
   - If probability < 65.5% → continue current task

4. **Test different scenarios:**

   | Scenario | Expected Probability | Should Suggest? |
   |---|---|---|
   | High task, fresh, energy=75 | ~15-25% | NO |
   | High task, 30 min, energy=60, low errors | ~35-45% | NO |
   | High task, 60 min, energy=50, high errors | ~70-80% | **YES** |
   | Low task (always easy) | ~5-15% | NO |

### Expected Output (when suggesting)
```
[MLPipeline] ✓ TaskSwitch: ML prob=74.2%, threshold=65.5% → SUGGEST
[InterventionEngine] Task switch recommended (confidence: 74%)
```

### Expected Output (when NOT suggesting)
```
[MLPipeline] ✓ TaskSwitch: ML prob=38.6%, threshold=65.5% → NO
```

---

## Quick Test Script

Run the app and monitor the terminal:

```powershell
npm start 2>&1 | Select-String -Pattern "MLPipeline|InterventionEngine"
```

### What You Should See (All Models Working)

**Every 60 seconds:**
```
[MLPipeline] ✓ Energy: ML raw=67.3, smoothed=65 (using ML model)
[MLPipeline] ✓ Break: ML prob=32.1%, threshold=45.9% → NO
[MLPipeline] ✓ TaskSwitch: ML prob=28.4%, threshold=65.5% → NO
```

**When break threshold is crossed:**
```
[MLPipeline] ✓ Break: ML prob=68.5%, threshold=45.9% → SUGGEST
[InterventionEngine] Break type: 🚶 Movement Break (You've been sitting for a while. Movement improves blood flow and cognitive function.)
```

---

## Common Issues & Fixes

### ❌ "ML failed, using rule-based fallback"
**Cause:** ONNX inference returned `null`  
**Fix:** Check that models are re-exported with `zipmap=False`

### ❌ "Classifier error: Non tensor type is temporarily not supported"
**Cause:** Model still has `ZipMap` operator  
**Fix:** Re-run `export_onnx.py` and copy models to `main/ml/models/`

### ❌ Break suggestions never appear
**Possible causes:**
1. Probability is below threshold (check logs)
2. Cooldown active (wait 15 min between interventions)
3. In flow state (deep work blocks interruptions)
4. Just started session (< 15 min)

### ❌ Energy not changing
**Check:**
1. Is activity tracking running? (keyboard/mouse logs)
2. Is questionnaire filled out? (baseline data needed)
3. Are you actually typing/moving mouse?

---

## Model Training Metrics (Reference)

From the last training run:

| Model | Type | Metric | Value | Threshold |
|---|---|---|---|---|
| Energy | Regressor | MAE | 4.99 | N/A |
| Energy | Regressor | R² | 0.907 | N/A |
| Break | Classifier | AUC | 0.993 | 0.459 |
| Break | Classifier | F1 | 0.909 | 0.459 |
| Task Switch | Classifier | AUC | 1.000 | 0.655 |
| Task Switch | Classifier | F1 | 1.000 | 0.655 |

**Interpretation:**
- **Energy MAE = 4.99:** On average, energy predictions are ±5 points off
- **Break AUC = 0.993:** 99.3% chance break suggestions are correct
- **Task Switch AUC = 1.0:** Perfect separation (on synthetic training data)

---

## Pipeline Flow

```
Every 60 seconds:
  ↓
1. Extract features from activity + database
  ↓
2. Energy Model
   Input: 18 features
   Output: raw score → smooth → UI
   Feed to: Break model (predicted_energy feature)
  ↓
3. Break Model
   Input: 24 features (includes predicted_energy)
   Output: probability → compare to 0.459 threshold
   Feed to: Task Switch model (break_suggestion_prob feature)
  ↓
4. Task Switch Model
   Input: 21 features (includes predicted_energy, break_suggestion_prob)
   Output: probability → compare to 0.655 threshold
  ↓
5. Intervention Engine
   - Evaluate break/switch suggestions
   - Apply cooldown + context rules
   - Recommend break TYPE if needed
  ↓
6. UI Update
   - Energy gauge
   - Break suggestion card (with AI-recommended type)
   - Task switch prompt
```

---

## Demo Scenario (Guaranteed to Trigger All 3 Models)

1. **Morning:** Fill out questionnaire (moderate sleep, moderate stress)
2. **Start working:** Energy should be 65-75
3. **Work for 60 minutes:** Type actively, make ~10-15 typos
4. **Check terminal:** Should see break probability rising
5. **At 60-70 min:** Break suggestion should trigger
6. **Check UI:** "AI Recommended" break type should appear
7. **If working on hard task:** Task switch might also suggest

**Expected terminal output:**
```
[MLPipeline] ✓ Energy: ML raw=58.2, smoothed=57 (using ML model)
[MLPipeline] ✓ Break: ML prob=71.3%, threshold=45.9% → SUGGEST
[MLPipeline] ✓ TaskSwitch: ML prob=62.1%, threshold=65.5% → NO
[InterventionEngine] Break type: 🚶 Movement Break (You've been sitting for a while...)
```
