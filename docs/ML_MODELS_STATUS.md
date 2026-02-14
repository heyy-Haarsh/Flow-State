# FlowState ML Models - Status Report

## ✅ All 3 Models Working

As of 2026-02-15, all three ML models are loading and running successfully:

```
[MLPipeline] ✓ Energy model loaded from: E:\NMA04\flowstate\main\ml\models\energy-model.onnx
[MLPipeline] ✓ Break model loaded from: E:\NMA04\flowstate\main\ml\models\break-model.onnx, outputs: label,probabilities
[MLPipeline] ✓ Task switch model loaded from: E:\NMA04\flowstate\main\ml\models\task-switch-model.onnx, outputs: label,probabilities
[MLPipeline] 3/3 models loaded
```

**No more "Non tensor type is temporarily not supported" errors.**

---

## Model Details

### 1. Energy Predictor (Regressor)
- **File**: `energy-model.onnx` (110.0 KB)
- **Type**: LightGBM Regressor
- **Input**: 18 features (typing speed, error rate, session duration, questionnaire data, etc.)
- **Output**: Energy score (0-100)
- **Status**: ✅ Working
- **Smoothing**: EMA α=0.25, max Δ=±5 points/min

### 2. Break Suggester (Classifier)
- **File**: `break-model.onnx` (60.5 KB)
- **Type**: LightGBM Classifier (exported with `zipmap=False`)
- **Input**: 24 features (activity metrics + predicted energy + temporal context)
- **Output**: 
  - `label` (int64): Predicted class (0 or 1)
  - `probabilities` (float32, shape [1,2]): `[prob_class0, prob_class1]`
- **Status**: ✅ Working
- **Threshold**: 0.459 (from training)
- **Fallback**: Rule-based logic when model fails or returns null

### 3. Task Switch Recommender (Classifier)
- **File**: `task-switch-model.onnx` (62.0 KB)
- **Type**: LightGBM Classifier (exported with `zipmap=False`)
- **Input**: 21 features (task complexity, energy, error rate, deep work indicators)
- **Output**: 
  - `label` (int64): Predicted class (0 or 1)
  - `probabilities` (float32, shape [1,2]): `[prob_class0, prob_class1]`
- **Status**: ✅ Working
- **Threshold**: 0.655 (from training)
- **Fallback**: Rule-based logic when model fails or returns null

---

## What Was Fixed

### Problem
LightGBM classifiers exported to ONNX were using the `ZipMap` operator by default, which converts probability tensors into a sequence of maps. **`onnxruntime-node` (Node.js) does not support the ZipMap operator**, causing:
```
[MLPipeline] Classifier error: Non tensor type is temporarily not supported.
```

### Solution
Re-exported all models with `zipmap=False` in `ml-service/export_onnx.py`:
```python
is_classifier = hasattr(model, 'predict_proba')

onnx_model = onnxmltools.convert_lightgbm(
    model,
    initial_types=initial_types,
    target_opset=12,
    zipmap=not is_classifier  # False for classifiers
)
```

This makes classifiers output raw float32 probability tensors instead of maps.

### Updated Code
Updated `main/services/ml-inference.js` → `_predictClassifier()` to handle the new two-output format:
```javascript
// With zipmap=False, LightGBM classifiers output:
//   outputs[0] = labels (int64)
//   outputs[1] = probabilities (float32, shape [1, 2])
if (outputs.length >= 2) {
    const probabilities = Array.from(outputs[1].data);
    // We want prob_class1 (probability of positive class)
    return probabilities[1];
}
```

---

## Break Type Recommendation System

When a break is suggested, the system analyzes the user's state and recommends the optimal break type:

| Break Type | Triggers | Duration |
|---|---|---|
| 🧘 **Mindfulness** | High stress (≥7), very low energy (<30) | 3 min |
| 🚶 **Movement** | Long session (>60 min), long since break (>40 min) | 5 min |
| 👁️ **Eye Rest** | Extended screen time + session >45 min | 2 min |
| 🎨 **Creative** | High error rate (>15%), mental block | 5 min |
| 🥤 **Hydration** | Afternoon (2-4 PM), long since break (>90 min) | 3 min |
| 💬 **Social** | Very long solo session (>2 hrs) | 5 min |

Each recommendation includes:
- Specific activity suggestion (e.g., "4-7-8 breathing: inhale 4s, hold 7s, exhale 8s")
- Reasoning (e.g., "Your stress signals are elevated. A breathing exercise can reset your nervous system.")

---

## Intervention Triggers

### Break Suggestions
Triggered when **2+ conditions** are met (and no blockers):

**Triggers:**
- Session > 90 min
- Velocity < 35
- Error rate > 1.5× baseline
- Time since break > 60 min
- Energy < 45

**Blockers:**
- In deep work (flow state)
- Recent prompt (< 20 min ago)
- Just started session (< 15 min)

### Task Switch Suggestions
Triggered when working on a hard task with low energy or high errors.

---

## Data Flow

```
User Activity (keyboard, mouse)
  ↓
Monitors (with EMA smoothing, every 60s)
  ↓
SQLite Database (activity_events table)
  ↓
Feature Extractor (18 energy features, 24 break features, 21 switch features)
  ↓
ML Pipeline (ONNX inference)
  ├─ Energy Model → raw score → smoothing → UI
  ├─ Break Model → probability → threshold → intervention decision
  └─ Task Switch Model → probability → threshold → intervention decision
  ↓
Intervention Engine (with cooldown, break type recommender)
  ↓
IPC → React UI (BreakSuggestion component)
```

---

## Testing the Models

### Verify Models Are Loaded
Check terminal output on `npm start`:
```
[MLPipeline] ✓ Energy model loaded from: ...
[MLPipeline] ✓ Break model loaded from: ..., outputs: label,probabilities
[MLPipeline] ✓ Task switch model loaded from: ..., outputs: label,probabilities
[MLPipeline] 3/3 models loaded
```

### Verify Energy Predictions
Look for smooth energy transitions (no wild jumps):
```
[MLPipeline] Energy: raw=67, smoothed=65, delta=0.8, maxDelta=5.0
```

### Verify Break Suggestions
Work for >60 minutes without a break with moderate energy:
- Should see intervention with break type recommendation
- The "AI Recommended" break type should appear in the UI

### Verify Classifier Inference
**No errors like:**
```
[MLPipeline] Classifier error: Non tensor type is temporarily not supported.
```

---

## Re-Training Models

If you need to re-train and re-export:

```powershell
cd ml-service
.\venv\Scripts\python.exe export_onnx.py
```

This will:
1. Generate synthetic training data
2. Train all 3 models
3. Export to ONNX (with `zipmap=False` for classifiers)
4. Save to `ml-service/models/`

Then copy to Electron app:
```powershell
copy models\*.onnx ..\main\ml\models\
```

---

## Model Metadata

Training metrics are saved in:
- `main/ml/models/energy-metadata.json`
- `main/ml/models/break-metadata.json`
- `main/ml/models/taskSwitch-metadata.json`
- `main/ml/models/pipeline-metadata.json`

Example:
```json
{
  "mae": 4.99,
  "r2": 0.9074,
  "modelKey": "energy",
  "modelType": "regressor",
  "savedAt": "2026-02-15T00:38:01.123Z",
  "fileSizeBytes": 112627
}
```

---

## Troubleshooting

### "Classifier error: Non tensor type is temporarily not supported"
- **Cause**: Model was exported with `zipmap=True` (default)
- **Fix**: Re-export with `zipmap=False` (already done)

### Break suggestions never appearing
- **Check**: Is the app running for >45 minutes without a break?
- **Check**: Is energy < 60?
- **Check**: Look for `[InterventionEngine] Break type: ...` in terminal
- **Check**: Cooldown (15 min between interventions)

### Energy score not updating
- **Check**: Is `onEnergyUpdate` IPC listener registered? (Check React DevTools)
- **Check**: Is `_mlEnergyActive` flag set to `true` in Zustand store?

---

## Performance

- **Energy model inference**: ~5-10ms
- **Break model inference**: ~3-5ms
- **Task switch model inference**: ~3-5ms
- **Total pipeline**: ~15-20ms per cycle (every 60 seconds)
- **Model load time**: ~200-300ms (on app startup)

---

## Next Steps

For the demo, ensure:
1. ✅ All 3 models load without errors
2. ✅ Energy smoothing is visible (gradual changes)
3. ⚠️ **Test break suggestions** — work for 60+ min to trigger one
4. ⚠️ **Test break type diversity** — different scenarios should suggest different break types
5. ⚠️ **Fill out morning questionnaire** — this significantly affects energy predictions

