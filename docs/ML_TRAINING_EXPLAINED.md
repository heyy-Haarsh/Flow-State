# How FlowState ML Models Are Trained

## 🎯 Current Training Method: Synthetic Data

**Important:** Right now, the models are trained on **synthetic (fake but realistic) data**, NOT real user activity. This is a bootstrap approach to get the models working before real data is collected.

---

## 📊 Training Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Training Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Generate Synthetic Data (168 samples, 7 days)               │
│     ↓                                                           │
│  2. Train Energy Model (Regressor)                              │
│     ↓                                                           │
│  3. Run Energy Model → Add predicted_energy to dataset          │
│     ↓                                                           │
│  4. Train Break Model (Classifier, uses predicted_energy)       │
│     ↓                                                           │
│  5. Run Break Model → Add break_suggestion_prob to dataset      │
│     ↓                                                           │
│  6. Train Task Switch Model (Classifier, uses both)             │
│     ↓                                                           │
│  7. Export all 3 models to ONNX                                 │
│     ↓                                                           │
│  8. Copy to main/ml/models/ for Electron app                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Generate Synthetic Data

**File:** `ml-service/train_model.py`  
**Function:** `generate_dummy_data(num_days=7, samples_per_day=24)`  
**Lines:** 144-445

### What It Generates

The function creates **168 samples** (7 days × 24 hours) with realistic patterns:

#### **1. User Personality Profile** (Stable Across Week)
```python
user_avg_session_length = np.random.choice([60, 90, 120, 150])
user_switch_frequency = np.random.uniform(0.1, 0.5)  # switches per hour
historical_acceptance_rate = np.random.uniform(0.3, 0.8)
```

#### **2. Daily Questionnaire Values** (Vary by Day)
```python
sleep_quality = np.random.randint(3, 10)      # 3-10 scale
stress_level = np.random.randint(2, 9)        # 2-9 scale
caffeine_intake = np.random.choice([0,1,2,3]) # cups
exercise_today = np.random.choice([0, 1])     # yes/no
```

#### **3. Circadian Rhythm** (Energy Peaks Mid-Day)
```python
# Sine wave pattern: low at 6am, peak at 12pm, low at 6pm
circadian = np.sin((hour - 6) * np.pi / 12) * 0.3 + 0.7
if hour < 6 or hour > 22:
    circadian *= 0.4  # Very low energy late night/early morning
```

#### **4. Base Energy Formula** (Simulates Real Physics)
```python
base_energy = (
    sleep_quality * 5 +           # Good sleep = +50 energy
    (10 - stress_level) * 3 +     # Low stress = +30 energy
    exercise_today * 5 +          # Exercise = +5 energy
    caffeine_intake * 3 +         # Caffeine = +9 max
    circadian * 15                # Circadian rhythm = ±15
)
```

#### **5. Session Fatigue** (Energy Decreases Over Time)
```python
session_minutes = (hour - 8) * 15  # Assuming work starts at 8am
fatigue = max(0, session_minutes / 180)  # Fatigue builds over 3 hours
actual_energy = base_energy - fatigue * 15 + noise
```

#### **6. Activity Metrics** (Correlated with Energy)
```python
# Typing speed drops with low energy
typing_speed = baseline_typing_speed * (0.6 + actual_energy / 250) + noise

# Error rate increases with low energy
error_rate = baseline_error_rate * (2 - actual_energy / 100) + noise
```

---

### Target Generation (The Labels for Training)

This is **crucial** — the synthetic data includes **ground truth labels** based on logical rules:

#### **Target 1: Energy Score** (For Regressor)
```python
target_energy = round(actual_energy, 1)  # The "actual" simulated energy
```

#### **Target 2: Break Needed?** (For Classifier)
```python
# Calculate "break trigger score" based on conditions
break_trigger_score = 0

if time_since_break > 60:
    break_trigger_score += 2
if actual_energy < 50:
    break_trigger_score += 2
if velocity_trend == -1:  # Declining productivity
    break_trigger_score += 1
if error_rate_ratio > 1.5:  # Making more errors than usual
    break_trigger_score += 1
if session_minutes > 90:
    break_trigger_score += 1

# Calculate "blocker score" (reasons NOT to suggest break)
break_blocker_score = 0

if deep_work:  # In flow state
    break_blocker_score += 3
if minutes_since_last_prompt < 20:  # Just suggested
    break_blocker_score += 2
if session_minutes < 15:  # Just started
    break_blocker_score += 2

# Final decision
net_score = break_trigger_score - break_blocker_score

if net_score >= 3:
    break_target = 1  # Break is helpful
else:
    break_target = 0  # Break not needed
```

**This is how the model learns the logic!** We're encoding our domain knowledge into the training data.

#### **Target 3: Task Switch Needed?** (For Classifier)
```python
switch_trigger_score = 0

# Struggling on hard task?
if current_task_complexity == 2 and actual_energy < 55:
    switch_trigger_score += 2
if task_is_stuck:  # No progress in 15+ min
    switch_trigger_score += 2
if error_rate_ratio > 1.8:
    switch_trigger_score += 1
if has_urgent_simple_task:
    switch_trigger_score += 1

# Blockers
switch_blocker_score = 0
if deep_work:
    switch_blocker_score += 3
if recent_task_switch:  # Just switched
    switch_blocker_score += 2
if task_has_dependencies:  # Can't defer
    switch_blocker_score += 2

# Final decision
net_score = switch_trigger_score - switch_blocker_score

if net_score >= 2:
    task_switch_target = 1  # Switch recommended
else:
    task_switch_target = 0  # Continue current task
```

---

## Step 2-4: Train the Models

**File:** `ml-service/train_model.py`  
**Function:** `train_all_models(training_data=None, num_days=7)`  
**Lines:** 707-781

### Training Order (Pipeline!)

```python
def train_all_models(training_data=None, num_days=7):
    # 1. Generate or use provided data
    if training_data is None:
        training_data = generate_dummy_data(num_days=num_days)
    
    # 2. Train Energy Model (base of the pipeline)
    energy_result = train_energy_model(training_data)
    
    # 3. Run energy predictions and ADD them to dataset
    for sample in training_data:
        features = {k: sample[k] for k in ENERGY_FEATURE_NAMES}
        predicted_energy = energy_result['model'].predict([list(features.values())])[0]
        sample['predicted_energy'] = predicted_energy  # ← Feed to break model
    
    # 4. Train Break Model (uses predicted_energy as feature)
    break_result = train_break_model(training_data)
    
    # 5. Run break predictions and ADD them to dataset
    for sample in training_data:
        features = {k: sample[k] for k in BREAK_FEATURE_NAMES}
        break_prob = break_result['model'].predict_proba([list(features.values())])[0][1]
        sample['break_suggestion_prob'] = break_prob  # ← Feed to task switch model
    
    # 6. Train Task Switch Model (uses BOTH predicted_energy AND break_suggestion_prob)
    switch_result = train_task_switch_model(training_data)
    
    return {
        'energy': energy_result,
        'break': break_result,
        'task_switch': switch_result
    }
```

### Individual Model Training

Each model uses **LightGBM** (Gradient Boosting Decision Trees):

#### **Energy Model** (Regressor)
```python
def train_energy_model(training_data):
    df = pd.DataFrame(training_data)
    X = df[ENERGY_FEATURE_NAMES].fillna(0)  # 18 features
    y = df['current_energy']  # Target: 0-100
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    model = lgb.LGBMRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=5,
        num_leaves=31,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    return {'model': model, 'mae': mae, 'r2': r2, ...}
```

#### **Break Model** (Classifier)
```python
def train_break_model(training_data):
    df = pd.DataFrame(training_data)
    X = df[BREAK_FEATURE_NAMES].fillna(0)  # 24 features (includes predicted_energy!)
    y = df['break_target'].astype(int)  # Binary: 0 or 1
    
    # Sample weights: give more weight to clearly effective cases
    sample_weight = df.apply(lambda row:
        2.0 if row['break_effectiveness'] == 1 else
        1.5 if row['break_effectiveness'] == 0 and row['break_accepted'] else
        1.0,
        axis=1
    ).values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y)
    
    model = lgb.LGBMClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        num_leaves=15,
        random_state=42
    )
    
    model.fit(X_train, y_train, sample_weight=sw_train)
    
    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba)
    
    # Find optimal threshold
    precision, recall, thresholds = precision_recall_curve(y_test, y_pred_proba)
    f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
    best_idx = np.argmax(f1_scores)
    best_threshold = thresholds[best_idx]  # e.g., 0.459
    
    return {'model': model, 'auc': auc, 'threshold': best_threshold, ...}
```

#### **Task Switch Model** (Classifier)
```python
def train_task_switch_model(training_data):
    df = pd.DataFrame(training_data)
    X = df[TASK_SWITCH_FEATURE_NAMES].fillna(0)  # 21 features
    y = df['task_switch_target'].astype(int)  # Binary: 0 or 1
    
    # Sample weights: reward switches that improved velocity
    sample_weight = df.apply(lambda row:
        2.0 if row['user_switched'] and row['velocity_improved'] else
        1.5 if row['user_switched'] and not row.get('velocity_regressed', False) else
        1.0,
        axis=1
    ).values
    
    # Same training process as break model...
    model = lgb.LGBMClassifier(...)
    model.fit(X_train, y_train, sample_weight=sw_train)
    
    # Find optimal threshold (e.g., 0.655)
    ...
    
    return {'model': model, 'auc': auc, 'threshold': best_threshold, ...}
```

---

## Step 5-8: Export to ONNX

**File:** `ml-service/export_onnx.py`  
**Function:** `export_to_onnx(model, feature_names, output_path)`

```python
def export_to_onnx(model, feature_names, output_path):
    # Convert to ONNX format
    initial_types = [('float_input', FloatTensorType([None, len(feature_names)]))]
    
    # For classifiers: disable ZipMap (onnxruntime-node incompatible)
    is_classifier = hasattr(model, 'predict_proba')
    
    onnx_model = onnxmltools.convert_lightgbm(
        model,
        initial_types=initial_types,
        target_opset=12,
        zipmap=not is_classifier  # False for classifiers
    )
    
    # Save
    onnx.save_model(onnx_model, output_path)
```

Then copy to Electron app:
```bash
copy models\*.onnx ..\main\ml\models\
```

---

## 🔮 Future: Training on REAL Data

When you have real users, the training will switch to **actual data**:

### Real Data Collection

The app already collects:
- ✅ Activity metrics (keyboard, mouse) → `activity_events` table
- ✅ Questionnaire responses → `questionnaires` table
- ✅ Task data → `tasks` table
- ✅ Intervention responses → `interventions` table

### Real Training Process (Future)

```python
# Instead of generate_dummy_data(), query the database:
def fetch_training_data_from_db(user_id, days=30):
    # 1. Query activity_events
    activity_df = pd.read_sql("""
        SELECT timestamp, typing_kpm, error_rate, mouse_entropy
        FROM activity_events
        WHERE user_id = ? AND timestamp > datetime('now', '-30 days')
    """, conn, params=[user_id])
    
    # 2. Query questionnaires
    questionnaire_df = pd.read_sql("""
        SELECT date, sleep_quality, stress_level, caffeine_intake
        FROM questionnaires
        WHERE user_id = ?
    """, conn, params=[user_id])
    
    # 3. Query interventions (to know if breaks were helpful)
    intervention_df = pd.read_sql("""
        SELECT timestamp, type, accepted, energy_before, energy_after
        FROM interventions
        WHERE user_id = ?
    """, conn, params=[user_id])
    
    # 4. Join everything and create features
    training_data = merge_and_engineer_features(
        activity_df, questionnaire_df, intervention_df
    )
    
    # 5. Generate targets based on ACTUAL outcomes
    for sample in training_data:
        # Did the user accept the break AND did it help?
        if sample['break_suggested'] and sample['break_accepted']:
            energy_diff = sample['energy_after'] - sample['energy_before']
            sample['break_target'] = 1 if energy_diff > 5 else 0
        else:
            sample['break_target'] = 0
    
    return training_data

# Then train models the same way
real_data = fetch_training_data_from_db(user_id='demo_user')
results = train_all_models(training_data=real_data)
```

---

## 📊 Why Synthetic Data Works (For Now)

### Advantages:
1. ✅ **Bootstrapping:** Models work immediately without waiting for data
2. ✅ **Controlled:** We can test edge cases (very low energy, deep work, etc.)
3. ✅ **Domain Knowledge:** We encode our understanding of productivity patterns
4. ✅ **Consistent:** Same training data = reproducible results

### Limitations:
1. ⚠️ **Not Personalized:** Doesn't adapt to individual user patterns
2. ⚠️ **Simplified:** Real users are more complex than formulas
3. ⚠️ **Fixed Logic:** The "rules" in synthetic data are hardcoded

### The Plan:
1. **Phase 1 (Now):** Use synthetic data, get models working
2. **Phase 2 (Demo):** Collect real data from demo users
3. **Phase 3 (Production):** Re-train on real data, personalize per user

---

## 🎯 Key Insight: Transfer Learning

The synthetic data teaches the models **patterns** (not exact values):

```
Synthetic:  "Low energy (40) + long session (60 min) → Break helpful"
Real Data:  "Low energy (42) + long session (58 min) → Break helpful"
            ↑ The model generalizes!
```

Because we used **realistic correlations** in synthetic data generation (energy affects typing speed, errors increase when tired, etc.), the models learn general productivity patterns that transfer to real users.

---

## 🛠️ How to Re-Train

```bash
cd ml-service
.\venv\Scripts\python.exe export_onnx.py
```

This:
1. Generates 168 synthetic samples (7 days × 24 hours)
2. Trains all 3 models in pipeline order
3. Exports to ONNX
4. Saves to `ml-service/models/`

Then copy to Electron:
```bash
copy models\*.onnx ..\main\ml\models\
```

---

## Summary

**Current Training = Synthetic Data with Encoded Logic**

The models are trained on **realistic simulated data** where the targets (labels) are generated using **domain expertise rules**. This gives the models a strong starting point before real data is available.

The rules in `generate_dummy_data()` **are** the logic — just expressed as training examples instead of hardcoded if-statements!
