"""
FlowState - Unified ML Training Pipeline
==========================================
Three models working as a pipeline on shared data:

  1. Energy Predictor    (Regressor)  → Predicts energy score 0-100
  2. Break Suggester     (Classifier) → Should we suggest a break?
  3. Task Switch Recommender (Classifier) → Should we suggest switching tasks?

Pipeline flow:
  Raw metrics → [Energy Model] → energy_score
             → [Break Model]  → should_suggest_break (uses energy_score)
             → [Task Switch]  → should_suggest_switch (uses energy_score + break context)
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error, r2_score,
    roc_auc_score, precision_recall_curve, f1_score
)
import json
import os

# ==============================================================================
# SHARED FEATURE DEFINITIONS
# ==============================================================================

# --- Model 1: Energy Prediction Features ---
ENERGY_FEATURE_NAMES = [
    'typing_speed_5min',
    'typing_speed_15min',
    'error_rate_5min',
    'error_rate_15min',
    'mouse_entropy',
    'idle_percentage',
    'session_duration',
    'time_since_break',
    'tasks_completed_hour',
    'hour_of_day',
    'day_of_week',
    'sleep_quality',
    'stress_level',
    'caffeine_intake',
    'exercise_today',
    'expected_difficulty',
    'typing_speed_ratio',
    'error_rate_ratio',
]

ENERGY_TARGET = 'current_energy'

# --- Model 2: Break Suggestion Features ---
# Uses a superset of energy features + pipeline-derived features
BREAK_FEATURE_NAMES = [
    # Activity signals (shared with energy model)
    'typing_speed_5min',
    'typing_speed_15min',
    'typing_speed_ratio',
    'error_rate_5min',
    'error_rate_15min',
    'error_rate_ratio',
    'mouse_entropy',
    'idle_percentage',

    # Temporal context
    'time_since_break',
    'session_duration',
    'hour_of_day',
    'day_of_week',

    # Velocity & trends (derived during data generation)
    'velocity_5min',
    'velocity_15min',
    'velocity_trend',            # 1=increasing, 0=stable, -1=decreasing

    # Pipeline input: energy model output
    'predicted_energy',          # From Model 1

    # Session characteristics
    'tasks_completed_hour',
    'task_switches_last_hour',
    'deep_work_indicator',       # Boolean: in flow state?

    # Historical / personalization
    'user_avg_session_length',
    'historical_acceptance_rate',

    # Last intervention context
    'minutes_since_last_prompt',
    'last_prompt_accepted',
    'prompts_dismissed_streak',
]

# --- Model 3: Task Switch Features ---
TASK_SWITCH_FEATURE_NAMES = [
    # Current task context
    'current_task_complexity',      # 0=low, 1=medium, 2=high
    'current_task_duration',
    'current_task_progress',        # 0.0 to 1.0
    'current_task_error_rate',
    'task_is_stuck',                # Boolean: no progress 15+ min

    # Task queue context
    'num_low_complexity_available',
    'num_high_complexity_available',
    'has_urgent_simple_task',

    # User state (shared with other models)
    'typing_speed_ratio',
    'error_rate_ratio',
    'session_duration',
    'time_since_break',
    'idle_percentage',

    # Pipeline inputs from Model 1 & 2
    'predicted_energy',             # From Model 1
    'break_suggestion_prob',        # From Model 2

    # Velocity
    'velocity_15min',
    'velocity_trend',

    # Historical
    'user_switch_frequency',

    # Contextual blockers
    'deep_work_indicator',
    'recent_task_switch',           # Boolean: switched in last 10 min
    'task_has_dependencies',        # Boolean: can't defer
]

# Backward compatibility alias
FEATURE_NAMES = ENERGY_FEATURE_NAMES
TARGET_NAME = ENERGY_TARGET


# ==============================================================================
# UNIFIED DATA GENERATOR
# ==============================================================================

def generate_dummy_data(num_days=7, samples_per_day=24):
    """
    Generate realistic dummy data for ALL THREE models.
    
    Simulates a user across multiple days with:
      - Circadian rhythm patterns
      - Activity metric correlations
      - Break events & intervention responses
      - Task switching behavior
    
    Returns:
        list[dict]: Each sample has features for all 3 models + their targets
    """
    np.random.seed(42)
    data = []

    # --- User personality profile (stable across the week) ---
    user_avg_session_length = np.random.choice([60, 90, 120, 150])
    user_switch_frequency = np.random.uniform(0.1, 0.5)  # switches per hour
    historical_acceptance_rate = np.random.uniform(0.3, 0.8)

    last_break_time = 0       # tracks minutes since break
    last_prompt_time = -30    # tracks minutes since last prompt
    last_prompt_accepted = 0
    prompts_dismissed_streak = 0
    last_task_switch_time = -60

    for day in range(num_days):
        # --- Daily questionnaire values (vary by day) ---
        sleep_quality = np.random.randint(3, 10)
        stress_level = np.random.randint(2, 9)
        caffeine_intake = np.random.choice([0, 1, 2, 3])
        exercise_today = np.random.choice([0, 1])
        expected_difficulty = np.random.randint(3, 9)

        baseline_typing_speed = 50 + np.random.normal(0, 5)
        baseline_error_rate = 0.05 + np.random.normal(0, 0.01)

        # Task queue for the day
        num_low = np.random.randint(2, 6)
        num_high = np.random.randint(1, 4)
        current_task_complexity = np.random.choice([0, 1, 2])
        task_start_minute = 0
        task_progress = 0.0

        # Velocity history
        velocity_history = []

        for hour in range(samples_per_day):
            # --- Circadian rhythm ---
            circadian = np.sin((hour - 6) * np.pi / 12) * 0.3 + 0.7
            if hour < 6 or hour > 22:
                circadian *= 0.4

            # --- Base energy ---
            base_energy = (
                sleep_quality * 5 +
                (10 - stress_level) * 3 +
                exercise_today * 5 +
                caffeine_intake * 3 +
                circadian * 15
            )

            # --- Session fatigue ---
            session_minutes = max(0, (hour - 8) * 15 + np.random.normal(0, 10))
            fatigue = max(0, session_minutes / 180)

            # --- Actual energy ---
            actual_energy = base_energy - fatigue * 15 + np.random.normal(0, 5)
            actual_energy = np.clip(actual_energy, 0, 100)

            # --- Activity metrics correlated with energy ---
            typing_speed = baseline_typing_speed * (0.6 + actual_energy / 250) + np.random.normal(0, 3)
            error_rate = baseline_error_rate * (2 - actual_energy / 100) + np.random.normal(0, 0.005)
            error_rate = max(0, error_rate)

            time_since_break = last_break_time + np.random.randint(0, 15)
            tasks_completed = max(0, int(actual_energy / 30 + np.random.normal(0, 0.5)))

            typing_speed_ratio = typing_speed / max(baseline_typing_speed, 1)
            error_rate_ratio = error_rate / max(baseline_error_rate, 0.001)

            # --- Velocity metrics ---
            velocity_5min = typing_speed * (1 - error_rate * 5) + np.random.normal(0, 2)
            velocity_15min = typing_speed * (1 - error_rate * 3) + np.random.normal(0, 1)
            velocity_history.append(velocity_15min)

            # Velocity trend: compare last 3 readings
            if len(velocity_history) >= 3:
                recent_trend = velocity_history[-1] - velocity_history[-3]
                velocity_trend = 1 if recent_trend > 3 else (-1 if recent_trend < -3 else 0)
            else:
                velocity_trend = 0

            # --- Deep work indicator ---
            deep_work = (
                actual_energy > 65 and
                error_rate_ratio < 1.2 and
                typing_speed_ratio > 0.9 and
                time_since_break < 60
            )

            task_switches = int(np.random.poisson(user_switch_frequency))
            minutes_since_last_prompt = max(0, hour * 5 - last_prompt_time + np.random.randint(0, 10))

            # --- Simulate task context ---
            task_duration = hour * 3 - task_start_minute + np.random.randint(0, 20)
            task_progress = np.clip(task_progress + np.random.uniform(0.02, 0.15), 0, 1)
            task_is_stuck = (task_duration > 15 and task_progress < 0.1)
            current_task_error_rate = error_rate * (1 + current_task_complexity * 0.3)
            has_urgent_simple = np.random.choice([0, 1], p=[0.7, 0.3])
            recent_task_switch = (hour * 5 - last_task_switch_time) < 10
            task_has_deps = np.random.choice([0, 1], p=[0.8, 0.2])

            # ==============================================================
            # TARGET GENERATION (correlated with actual state)
            # ==============================================================

            # --- Energy target (Model 1) ---
            # The actual energy is the ground truth
            target_energy = round(actual_energy, 1)

            # --- Break suggestion target (Model 2) ---
            # A break is "helpful" if:
            #   - user has been going > 45 min without break
            #   - energy is declining (velocity_trend negative)
            #   - error rate is elevated
            #   - NOT in deep work
            break_trigger_score = 0
            if time_since_break > 60:
                break_trigger_score += 2
            elif time_since_break > 45:
                break_trigger_score += 1
            if actual_energy < 50:
                break_trigger_score += 2
            elif actual_energy < 65:
                break_trigger_score += 1
            if velocity_trend == -1:
                break_trigger_score += 1
            if error_rate_ratio > 1.5:
                break_trigger_score += 1
            if session_minutes > 90:
                break_trigger_score += 1

            # Blockers
            break_blocker_score = 0
            if deep_work:
                break_blocker_score += 3
            if minutes_since_last_prompt < 20:
                break_blocker_score += 2
            if session_minutes < 15:
                break_blocker_score += 2

            # Target: break was effective (1) vs not needed/annoying (-1/0)
            net_break_score = break_trigger_score - break_blocker_score
            if net_break_score >= 3:
                break_effectiveness = 1   # Helpful
            elif net_break_score >= 1:
                break_effectiveness = 0   # Neutral
            else:
                break_effectiveness = -1  # Annoying / not needed

            # Binary target for classifier: was break needed?
            break_target = 1 if break_effectiveness == 1 else 0

            # Simulate user acceptance (correlates with actual need)
            if break_effectiveness == 1:
                break_accepted = np.random.choice([1, 0], p=[0.7, 0.3])
            elif break_effectiveness == 0:
                break_accepted = np.random.choice([1, 0], p=[0.4, 0.6])
            else:
                break_accepted = np.random.choice([1, 0], p=[0.1, 0.9])

            # Update break tracking
            if break_accepted:
                last_break_time = 0
                last_prompt_accepted = 1
                prompts_dismissed_streak = 0
            else:
                last_break_time += np.random.randint(5, 20)
                if break_trigger_score >= 2:
                    last_prompt_accepted = 0
                    prompts_dismissed_streak += 1

            # --- Task switch target (Model 3) ---
            # A task switch is helpful if:
            #   - working on a hard task while energy is low
            #   - stuck on current task
            #   - error rate is high on current task
            #   - easy tasks available
            switch_trigger_score = 0
            if current_task_complexity == 2 and actual_energy < 55:
                switch_trigger_score += 2
            if task_is_stuck:
                switch_trigger_score += 2
            if current_task_error_rate > baseline_error_rate * 1.5:
                switch_trigger_score += 1
            if num_low > 0 and actual_energy < 60:
                switch_trigger_score += 1
            if has_urgent_simple:
                switch_trigger_score += 1

            # Blockers for task switch
            switch_blocker_score = 0
            if deep_work:
                switch_blocker_score += 3
            if recent_task_switch:
                switch_blocker_score += 2
            if task_has_deps:
                switch_blocker_score += 2
            if task_progress > 0.8:
                switch_blocker_score += 1  # Almost done, don't switch

            net_switch_score = switch_trigger_score - switch_blocker_score
            switch_target = 1 if net_switch_score >= 2 else 0

            # Simulate user switching
            if switch_target == 1:
                user_switched = np.random.choice([1, 0], p=[0.6, 0.4])
                velocity_improved = np.random.choice([1, 0], p=[0.65, 0.35]) if user_switched else 0
            else:
                user_switched = np.random.choice([1, 0], p=[0.15, 0.85])
                velocity_improved = np.random.choice([1, 0], p=[0.3, 0.7]) if user_switched else 0

            if user_switched:
                last_task_switch_time = hour * 5
                current_task_complexity = np.random.choice([0, 1])
                task_start_minute = hour * 5
                task_progress = 0.0

            # ==============================================================
            # BUILD UNIFIED SAMPLE
            # ==============================================================
            sample = {
                # === Shared raw metrics ===
                'typing_speed_5min': round(typing_speed + np.random.normal(0, 2), 1),
                'typing_speed_15min': round(typing_speed + np.random.normal(0, 1), 1),
                'error_rate_5min': round(max(0, error_rate + np.random.normal(0, 0.005)), 4),
                'error_rate_15min': round(max(0, error_rate + np.random.normal(0, 0.003)), 4),
                'mouse_entropy': round(np.clip(0.5 + actual_energy / 200 + np.random.normal(0, 0.1), 0, 1), 3),
                'idle_percentage': round(np.clip(0.3 - actual_energy / 400 + np.random.normal(0, 0.05), 0, 1), 3),
                'session_duration': round(session_minutes, 1),
                'time_since_break': time_since_break,
                'tasks_completed_hour': tasks_completed,
                'hour_of_day': hour,
                'day_of_week': day % 7,
                'sleep_quality': sleep_quality,
                'stress_level': stress_level,
                'caffeine_intake': caffeine_intake,
                'exercise_today': exercise_today,
                'expected_difficulty': expected_difficulty,
                'typing_speed_ratio': round(typing_speed_ratio, 3),
                'error_rate_ratio': round(error_rate_ratio, 3),

                # === Velocity & Trends (used by break & switch models) ===
                'velocity_5min': round(velocity_5min, 1),
                'velocity_15min': round(velocity_15min, 1),
                'velocity_trend': velocity_trend,

                # === Session / intervention context ===
                'deep_work_indicator': int(deep_work),
                'task_switches_last_hour': task_switches,
                'user_avg_session_length': user_avg_session_length,
                'historical_acceptance_rate': round(historical_acceptance_rate, 2),
                'minutes_since_last_prompt': minutes_since_last_prompt,
                'last_prompt_accepted': last_prompt_accepted,
                'prompts_dismissed_streak': prompts_dismissed_streak,

                # === Pipeline features (set as 0 during training, computed at inference) ===
                'predicted_energy': round(actual_energy, 1),  # Simulates Model 1 output
                'break_suggestion_prob': round(max(0, net_break_score / 7), 3),  # Simulates Model 2 output

                # === Task context ===
                'current_task_complexity': current_task_complexity,
                'current_task_duration': round(task_duration, 1),
                'current_task_progress': round(task_progress, 2),
                'current_task_error_rate': round(current_task_error_rate, 4),
                'task_is_stuck': int(task_is_stuck),
                'num_low_complexity_available': num_low,
                'num_high_complexity_available': num_high,
                'has_urgent_simple_task': has_urgent_simple,
                'user_switch_frequency': round(user_switch_frequency, 2),
                'recent_task_switch': int(recent_task_switch),
                'task_has_dependencies': int(task_has_deps),

                # === TARGETS ===
                'current_energy': target_energy,           # Model 1 target
                'break_target': break_target,              # Model 2 target
                'break_effectiveness': break_effectiveness,
                'break_accepted': break_accepted,
                'task_switch_target': switch_target,        # Model 3 target
                'user_switched': user_switched,
                'velocity_improved': velocity_improved,
            }

            data.append(sample)

            # Update prompt timing
            if break_trigger_score >= 2:
                last_prompt_time = hour * 5

    return data


# ==============================================================================
# MODEL 1: ENERGY PREDICTOR (Regressor)
# ==============================================================================

def train_energy_model(training_data):
    """
    Train a LightGBM regressor to predict energy score (0-100).
    This is the foundation of the pipeline.
    
    Args:
        training_data: list of dicts with feature names + 'current_energy' target
    
    Returns:
        dict with model, metrics, and feature info
    """
    if not training_data or len(training_data) < 10:
        print("[Energy Model] Not enough data (need at least 10 samples)")
        return None

    df = pd.DataFrame(training_data)
    print(f"\n{'='*60}")
    print(f"  MODEL 1: ENERGY PREDICTOR (Regressor)")
    print(f"{'='*60}")
    print(f"  Dataset: {len(df)} samples, {len(ENERGY_FEATURE_NAMES)} features")

    X = df[ENERGY_FEATURE_NAMES].fillna(0)
    y = df[ENERGY_TARGET].clip(0, 100)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = lgb.LGBMRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=5,
        num_leaves=31,
        min_child_samples=5,
        subsample=0.8,
        colsample_bytree=0.8,
        verbose=-1,
    )

    model.fit(X_train, y_train, eval_set=[(X_test, y_test)])

    predictions = np.clip(model.predict(X_test), 0, 100)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    importance = dict(zip(ENERGY_FEATURE_NAMES, model.feature_importances_.tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]

    print(f"  Results:")
    print(f"    MAE:  {mae:.2f}")
    print(f"    R²:   {r2:.4f}")
    print(f"    Top:  {[f[0] for f in top_features]}")

    return {
        'model': model,
        'mae': round(mae, 2),
        'r2': round(r2, 4),
        'num_samples': len(df),
        'feature_names': ENERGY_FEATURE_NAMES,
        'feature_importance': importance,
    }


# ==============================================================================
# MODEL 2: BREAK SUGGESTION (Classifier)
# ==============================================================================

def train_break_model(training_data):
    """
    Train a LightGBM classifier to predict whether a break suggestion
    will be accepted AND effective.
    
    Uses output of energy model (predicted_energy) as a pipeline feature.
    
    Args:
        training_data: list of dicts (same dataset, uses break_target)
    
    Returns:
        dict with model, metrics, threshold, and feature info
    """
    if not training_data or len(training_data) < 10:
        print("[Break Model] Not enough data (need at least 10 samples)")
        return None

    df = pd.DataFrame(training_data)
    print(f"\n{'='*60}")
    print(f"  MODEL 2: BREAK SUGGESTER (Classifier)")
    print(f"{'='*60}")
    print(f"  Dataset: {len(df)} samples, {len(BREAK_FEATURE_NAMES)} features")

    X = df[BREAK_FEATURE_NAMES].fillna(0)

    # Binary target: was the break effective?
    y = df['break_target'].astype(int)

    # Sample weights: give more weight to clearly effective/ineffective cases
    sample_weight = df.apply(lambda row:
        2.0 if row['break_effectiveness'] == 1 else
        1.5 if row['break_effectiveness'] == 0 and row['break_accepted'] else
        1.0,
        axis=1
    ).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    sw_train, sw_test = train_test_split(
        sample_weight, test_size=0.2, random_state=42
    )

    model = lgb.LGBMClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        min_child_samples=10,
        class_weight='balanced',
        verbose=-1,
    )

    model.fit(X_train, y_train, sample_weight=sw_train)

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_test_binary = y_test.astype(int)

    auc = roc_auc_score(y_test_binary, y_pred_proba)

    # Find optimal threshold (maximize F1)
    precision, recall, thresholds = precision_recall_curve(
        y_test_binary, y_pred_proba
    )
    f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
    optimal_threshold = float(thresholds[np.argmax(f1_scores)]) if len(thresholds) > 0 else 0.5

    # F1 at optimal threshold
    y_pred_binary = (y_pred_proba >= optimal_threshold).astype(int)
    f1 = f1_score(y_test_binary, y_pred_binary)

    importance = dict(zip(BREAK_FEATURE_NAMES, model.feature_importances_.tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]

    print(f"  Results:")
    print(f"    AUC:        {auc:.3f}")
    print(f"    F1:         {f1:.3f}")
    print(f"    Threshold:  {optimal_threshold:.3f}")
    print(f"    Top:  {[f[0] for f in top_features]}")

    return {
        'model': model,
        'auc': round(auc, 3),
        'f1': round(f1, 3),
        'threshold': round(optimal_threshold, 3),
        'num_samples': len(df),
        'feature_names': BREAK_FEATURE_NAMES,
        'feature_importance': importance,
    }


# ==============================================================================
# MODEL 3: TASK SWITCH RECOMMENDER (Classifier)
# ==============================================================================

def train_task_switch_model(training_data):
    """
    Train a LightGBM classifier to predict whether a task switch
    will improve productivity.
    
    Uses output of both Energy (predicted_energy) and Break (break_suggestion_prob)
    models as pipeline features.
    
    Args:
        training_data: list of dicts (same dataset, uses task_switch_target)
    
    Returns:
        dict with model, metrics, threshold, and feature info
    """
    if not training_data or len(training_data) < 10:
        print("[Task Switch Model] Not enough data (need at least 10 samples)")
        return None

    df = pd.DataFrame(training_data)
    print(f"\n{'='*60}")
    print(f"  MODEL 3: TASK SWITCH RECOMMENDER (Classifier)")
    print(f"{'='*60}")
    print(f"  Dataset: {len(df)} samples, {len(TASK_SWITCH_FEATURE_NAMES)} features")

    X = df[TASK_SWITCH_FEATURE_NAMES].fillna(0)

    # Binary target: was the task switch recommended?
    y = df['task_switch_target'].astype(int)

    # Sample weights: reward switches that improved velocity
    sample_weight = df.apply(lambda row:
        2.0 if row['user_switched'] and row['velocity_improved'] else
        1.5 if row['user_switched'] and not row.get('velocity_regressed', False) else
        1.0,
        axis=1
    ).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    sw_train, sw_test = train_test_split(
        sample_weight, test_size=0.2, random_state=42
    )

    model = lgb.LGBMClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        min_child_samples=10,
        class_weight='balanced',
        verbose=-1,
    )

    model.fit(X_train, y_train, sample_weight=sw_train)

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_test_binary = y_test.astype(int)

    auc = roc_auc_score(y_test_binary, y_pred_proba)

    # Optimal threshold
    precision, recall, thresholds = precision_recall_curve(
        y_test_binary, y_pred_proba
    )
    f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
    optimal_threshold = float(thresholds[np.argmax(f1_scores)]) if len(thresholds) > 0 else 0.5

    y_pred_binary = (y_pred_proba >= optimal_threshold).astype(int)
    f1 = f1_score(y_test_binary, y_pred_binary)

    importance = dict(zip(TASK_SWITCH_FEATURE_NAMES, model.feature_importances_.tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]

    print(f"  Results:")
    print(f"    AUC:        {auc:.3f}")
    print(f"    F1:         {f1:.3f}")
    print(f"    Threshold:  {optimal_threshold:.3f}")
    print(f"    Top:  {[f[0] for f in top_features]}")

    return {
        'model': model,
        'auc': round(auc, 3),
        'f1': round(f1, 3),
        'threshold': round(optimal_threshold, 3),
        'num_samples': len(df),
        'feature_names': TASK_SWITCH_FEATURE_NAMES,
        'feature_importance': importance,
    }


# ==============================================================================
# UNIFIED PIPELINE TRAINER
# ==============================================================================

def train_all_models(training_data=None, num_days=7):
    """
    Train all 3 models on shared data in the correct pipeline order.
    
    Pipeline:
      1. Energy Model: learns to predict energy from raw metrics
      2. Break Model:  uses predicted_energy + metrics → should_suggest_break
      3. Task Switch:  uses predicted_energy + break_prob + task context → should_switch
    
    Args:
        training_data: optional pre-generated data
        num_days: number of days for dummy data (if training_data is None)
    
    Returns:
        dict with all 3 model results
    """
    if training_data is None:
        print("[Pipeline] Generating unified training data...")
        training_data = generate_dummy_data(num_days=num_days)

    print(f"\n{'#'*60}")
    print(f"  FLOWSTATE ML PIPELINE - TRAINING ALL MODELS")
    print(f"  Samples: {len(training_data)}  |  Days: {num_days}")
    print(f"{'#'*60}")

    # --- Step 1: Train Energy Model ---
    energy_result = train_energy_model(training_data)
    if energy_result is None:
        print("[Pipeline] Energy model training failed. Aborting pipeline.")
        return None

    # --- Step 1.5: Enrich data with Model 1 predictions ---
    # In production, the break model uses real-time energy predictions.
    # During training, we simulate this by running the energy model on training data.
    df = pd.DataFrame(training_data)
    X_energy = df[ENERGY_FEATURE_NAMES].fillna(0)
    energy_preds = np.clip(energy_result['model'].predict(X_energy), 0, 100)
    for i, sample in enumerate(training_data):
        sample['predicted_energy'] = round(float(energy_preds[i]), 1)

    # --- Step 2: Train Break Model ---
    # Rebuild DataFrame to pick up enriched predicted_energy values
    break_result = train_break_model(training_data)

    # --- Step 2.5: Enrich data with Model 2 predictions ---
    if break_result is not None:
        df_break = pd.DataFrame(training_data)
        X_break = df_break[BREAK_FEATURE_NAMES].fillna(0)
        break_probs = break_result['model'].predict_proba(X_break)[:, 1]
        for i, sample in enumerate(training_data):
            sample['break_suggestion_prob'] = round(float(break_probs[i]), 3)

    # --- Step 3: Train Task Switch Model ---
    task_switch_result = train_task_switch_model(training_data)

    # --- Summary ---
    print(f"\n{'#'*60}")
    print(f"  PIPELINE TRAINING COMPLETE")
    print(f"{'#'*60}")

    results = {
        'energy': energy_result,
        'break_suggestion': break_result,
        'task_switch': task_switch_result,
    }

    if energy_result:
        print(f"  Energy Model:      MAE={energy_result['mae']}, R²={energy_result['r2']}")
    if break_result:
        print(f"  Break Model:       AUC={break_result['auc']}, F1={break_result['f1']}, Thresh={break_result['threshold']}")
    if task_switch_result:
        print(f"  Task Switch Model: AUC={task_switch_result['auc']}, F1={task_switch_result['f1']}, Thresh={task_switch_result['threshold']}")

    print()
    return results


# ==============================================================================
# STANDALONE ENTRY POINT
# ==============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("FlowState ML Pipeline - Standalone Training")
    print("=" * 60)

    # Generate unified data
    data = generate_dummy_data(num_days=7)
    print(f"\nGenerated {len(data)} training samples")

    # Train all models in pipeline order
    results = train_all_models(data)

    if results:
        print("\n[OK] All models trained successfully!")
        if results['energy']:
            print(f"  Energy:     MAE={results['energy']['mae']}, R²={results['energy']['r2']}")
        if results['break_suggestion']:
            print(f"  Break:      AUC={results['break_suggestion']['auc']}, F1={results['break_suggestion']['f1']}")
        if results['task_switch']:
            print(f"  TaskSwitch: AUC={results['task_switch']['auc']}, F1={results['task_switch']['f1']}")
    else:
        print("\n[FAIL] Pipeline training failed!")