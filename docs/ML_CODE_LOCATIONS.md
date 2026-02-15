# FlowState ML Models - Code Location Guide

## 📍 Where is Everything?

### **Model Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FlowState ML Pipeline                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Activity Data] → [Feature Extraction] → [ML Models] → [UI]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Break Suggestion Model

### **Training Code** (Python)

📁 **File:** `ml-service/train_model.py`  
📍 **Lines:** 519-606  
🔧 **Function:** `train_break_model(training_data)`

**What it does:**
- Trains a LightGBM binary classifier
- Predicts: "Should we suggest a break?"
- Uses 24 features including `predicted_energy` from Model #1

**Key Features Used:**
```python
BREAK_FEATURE_NAMES = [
    # Activity signals
    'typing_speed_5min',
    'error_rate_ratio',
    'mouse_entropy',
    
    # Temporal context
    'time_since_break',
    'session_duration',
    'hour_of_day',
    
    # Pipeline input from Energy Model
    'predicted_energy',  # ← From Model #1
    
    # User behavior
    'historical_acceptance_rate',
    'prompts_dismissed_streak',
    # ... 24 features total
]
```

**Target:**
```python
# Binary: 1 = break was effective, 0 = break not needed
y = df['break_target'].astype(int)
```

**Threshold Optimization:**
```python
# Find optimal threshold using precision-recall curve
precision, recall, thresholds = precision_recall_curve(y_test, y_pred_proba)
f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
best_idx = np.argmax(f1_scores)
best_threshold = thresholds[best_idx]  # ~0.459
```

---

### **Inference Code** (JavaScript)

📁 **File:** `main/services/ml-inference.js`  
📍 **Lines:** 306-340  
🔧 **Method:** `MLPipeline.predictPipeline()` → Step 2

**How it works:**
```javascript
// Step 2: Break Suggestion
if (this.loaded.break) {
    const breakProba = await this._predictClassifier(
        this.breakSession,     // ONNX session
        enriched,              // Features (includes predicted_energy)
        BREAK_FEATURE_ORDER    // Feature names in correct order
    );
    
    if (breakProba !== null) {
        // Compare to threshold
        result.shouldSuggestBreak = breakProba >= this.breakThreshold; // 0.459
        
        // Feed probability to Task Switch model
        enriched.break_suggestion_prob = breakProba;
        
        console.log(`[MLPipeline] ✓ Break: ML prob=${breakProba}%`);
    } else {
        // Fallback to rules if ML fails
        const breakFallback = this._ruleBasedBreakSuggestion(enriched);
        result.shouldSuggestBreak = breakFallback.shouldSuggest;
    }
}
```

**Feature Order Definition:**
```javascript
// Lines 48-72
const BREAK_FEATURE_ORDER = [
    'typing_speed_5min',
    'typing_speed_15min',
    'typing_speed_ratio',
    'error_rate_5min',
    'error_rate_15min',
    'error_rate_ratio',
    'mouse_entropy',
    'idle_percentage',
    'time_since_break',
    'session_duration',
    'hour_of_day',
    'day_of_week',
    'velocity_5min',
    'velocity_15min',
    'velocity_trend',
    'predicted_energy',  // ← From Step 1 (Energy Model)
    'tasks_completed_hour',
    'task_switches_last_hour',
    'deep_work_indicator',
    'user_avg_session_length',
    'historical_acceptance_rate',
    'minutes_since_last_prompt',
    'last_prompt_accepted',
    'prompts_dismissed_streak',
];
```

---

### **Intervention Trigger** (JavaScript)

📁 **File:** `main/services/intervention-engine.js`  
📍 **Lines:** 73-90  
🔧 **Method:** `InterventionEngine.evaluate()`

**Decision Logic:**
```javascript
// Priority 2: ML-powered break suggestion
if (pipelineResult && pipelineResult.shouldSuggestBreak) {
    return this._createIntervention({
        type: 'break_suggestion',
        title: 'Energy Dipping',
        message: `Your energy is at ${energyScore}. A short break could help recharge.`,
        actions: ['Take Break', 'Dismiss'],
        confidence: pipelineResult.breakConfidence,  // 0.0-1.0
        source: pipelineResult.modelsUsed?.break ? 'ml' : 'rule',  // Shows if ML was used
        
        // Break type recommendation (lines 213-260)
        _sessionDuration: sessionDuration,  // Used to recommend break TYPE
        _timeSinceBreak: timeSinceBreak,
        _errorRate: errorRate,
    });
}
```

---

## 2️⃣ Task Switch Model

### **Training Code** (Python)

📁 **File:** `ml-service/train_model.py`  
📍 **Lines:** 613-700  
🔧 **Function:** `train_task_switch_model(training_data)`

**What it does:**
- Trains a LightGBM binary classifier
- Predicts: "Should we suggest switching to an easier task?"
- Uses 21 features including `predicted_energy` AND `break_suggestion_prob`

**Key Features Used:**
```python
TASK_SWITCH_FEATURE_NAMES = [
    # Current task context
    'current_task_complexity',  # 0=low, 1=medium, 2=high
    'current_task_duration',
    'current_task_progress',
    'current_task_error_rate',
    'task_is_stuck',  # Boolean: no progress 15+ min
    
    # Pipeline inputs from Model #1 & #2
    'predicted_energy',          # ← From Energy Model
    'break_suggestion_prob',     # ← From Break Model
    
    # User state
    'typing_speed_ratio',
    'error_rate_ratio',
    'session_duration',
    
    # Task queue
    'num_low_complexity_available',
    'has_urgent_simple_task',
    
    # Contextual blockers
    'deep_work_indicator',
    'recent_task_switch',
    'task_has_dependencies',
    # ... 21 features total
]
```

**Target:**
```python
# Binary: 1 = switch recommended, 0 = continue current task
y = df['task_switch_target'].astype(int)
```

**Threshold:**
```python
# Same optimization as break model
best_threshold = thresholds[best_idx]  # ~0.655
```

---

### **Inference Code** (JavaScript)

📁 **File:** `main/services/ml-inference.js`  
📍 **Lines:** 342-376  
🔧 **Method:** `MLPipeline.predictPipeline()` → Step 3

**How it works:**
```javascript
// Step 3: Task Switch Recommendation
if (this.loaded.taskSwitch) {
    const switchProba = await this._predictClassifier(
        this.switchSession,        // ONNX session
        enriched,                  // Features (includes predicted_energy AND break_suggestion_prob)
        TASK_SWITCH_FEATURE_ORDER  // Feature names
    );
    
    if (switchProba !== null) {
        // Compare to threshold
        result.shouldSuggestSwitch = switchProba >= this.switchThreshold; // 0.655
        
        console.log(`[MLPipeline] ✓ TaskSwitch: ML prob=${switchProba}%`);
    } else {
        // Fallback to rules
        const switchFallback = this._ruleBasedTaskSwitch(enriched);
        result.shouldSuggestSwitch = switchFallback.shouldSuggest;
    }
}
```

**Feature Order Definition:**
```javascript
// Lines 76-97
const TASK_SWITCH_FEATURE_ORDER = [
    'current_task_complexity',
    'current_task_duration',
    'current_task_progress',
    'current_task_error_rate',
    'task_is_stuck',
    'num_low_complexity_available',
    'num_high_complexity_available',
    'has_urgent_simple_task',
    'typing_speed_ratio',
    'error_rate_ratio',
    'session_duration',
    'time_since_break',
    'idle_percentage',
    'predicted_energy',          // ← From Step 1
    'break_suggestion_prob',     // ← From Step 2
    'velocity_15min',
    'velocity_trend',
    'user_switch_frequency',
    'deep_work_indicator',
    'recent_task_switch',
    'task_has_dependencies',
];
```

---

### **Intervention Trigger** (JavaScript)

📁 **File:** `main/services/intervention-engine.js`  
📍 **Lines:** 95-114  
🔧 **Method:** `InterventionEngine.evaluate()`

**Decision Logic:**
```javascript
// Priority 3: ML-powered task switch recommendation
if (pipelineResult && pipelineResult.shouldSuggestSwitch) {
    const easyTasks = (pendingTasks || []).filter(
        (t) => t.complexity === 'low' || t.complexity === 'medium'
    );
    
    if (easyTasks.length > 0) {
        return this._createIntervention({
            type: 'task_switch',
            title: 'Switch to Easier Task?',
            message: "The model suggests you'd be more productive switching to a simpler task right now.",
            suggestedTasks: easyTasks.slice(0, 3),  // Top 3
            actions: ['Switch Task', 'Keep Going'],
            confidence: pipelineResult.switchConfidence,
            source: pipelineResult.modelsUsed?.taskSwitch ? 'ml' : 'rule',
        });
    }
}
```

---

## 🔧 Helper Functions

### **Classifier Inference** (JavaScript)

📁 **File:** `main/services/ml-inference.js`  
📍 **Lines:** 198-249  
🔧 **Method:** `MLPipeline._predictClassifier()`

```javascript
async _predictClassifier(session, features, featureOrder) {
    const ort = require('onnxruntime-node');
    
    // Build input tensor
    const inputArray = new Float32Array(
        featureOrder.map(key => {
            const v = features[key];
            if (typeof v === 'boolean') return v ? 1.0 : 0.0;
            return Number(v) || 0;
        })
    );
    
    const tensor = new ort.Tensor('float32', inputArray, [1, featureOrder.length]);
    const results = await session.run({ float_input: tensor });
    
    // Get outputs (with zipmap=False, classifiers output 2 tensors)
    const outputs = Object.values(results);
    //   outputs[0] = labels (int64)
    //   outputs[1] = probabilities (float32, shape [1, 2])
    
    if (outputs.length >= 2) {
        const probabilities = Array.from(outputs[1].data);
        return probabilities[1];  // Probability of positive class
    }
    
    return null;  // Error
}
```

---

### **Rule-Based Fallbacks** (JavaScript)

📁 **File:** `main/services/ml-inference.js`  
📍 **Lines:** 396-480  

**Break Fallback:**
```javascript
_ruleBasedBreakSuggestion(features) {
    const { 
        predicted_energy = 50, 
        time_since_break = 0, 
        session_duration = 0, 
        error_rate_ratio = 1.0 
    } = features;
    
    // Simple heuristic
    if (session_duration > 60 && time_since_break > 45 && predicted_energy < 55) {
        return { shouldSuggest: true, confidence: 0.7, reason: 'Rule: long session + low energy' };
    }
    
    return { shouldSuggest: false, confidence: 0.3, reason: 'Rule: conditions not met' };
}
```

**Task Switch Fallback:**
```javascript
_ruleBasedTaskSwitch(features) {
    const { 
        current_task_complexity = 1, 
        predicted_energy = 50, 
        error_rate_ratio = 1.0 
    } = features;
    
    // Simple heuristic
    if (current_task_complexity === 2 && predicted_energy < 50 && error_rate_ratio > 1.5) {
        return { shouldSuggest: true, confidence: 0.6, reason: 'Rule: hard task + low energy + errors' };
    }
    
    return { shouldSuggest: false, confidence: 0.4, reason: 'Rule: conditions not met' };
}
```

---

## 📊 Data Flow Summary

```
┌──────────────────────────────────────────────────────────────┐
│  Every 60 seconds (main/main.js, line 169):                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Extract features (keyboard, mouse, tasks, DB)            │
│     ↓                                                        │
│  2. MLPipeline.predictPipeline(features)                     │
│     ├─ Energy Model → predicted_energy                       │
│     ├─ Break Model  → shouldSuggestBreak (uses energy)       │
│     └─ Task Switch  → shouldSuggestSwitch (uses energy+break)│
│     ↓                                                        │
│  3. InterventionEngine.evaluate(pipelineResult, context)     │
│     ├─ Check cooldowns                                      │
│     ├─ Apply priority rules                                 │
│     └─ _recommendBreakType() if break suggested             │
│     ↓                                                        │
│  4. IPC → React UI                                           │
│     └─ BreakSuggestion component shows "AI Recommended" type │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Locations

See `docs/ML_TESTING_GUIDE.md` for:
- How to verify each model is using ML (not fallback)
- Expected terminal output
- Test scenarios for each model

Key logs to watch:
```
[MLPipeline] ✓ Break: ML prob=68.5%, threshold=45.9% → SUGGEST
[MLPipeline] ✓ TaskSwitch: ML prob=74.2%, threshold=65.5% → SUGGEST
```

If you see `⚠` instead of `✓`, it means the model failed and fell back to rules.
