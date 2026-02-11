"""
FlowState - Model Training Pipeline
====================================
Trains a LightGBM regressor on Week 1 questionnaire + activity data
to predict energy scores (0-100).
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import json
import os

FEATURE_NAMES = [
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

TARGET_NAME = 'current_energy'


def generate_dummy_data(num_days=7, samples_per_day=24):
    """
    Generate realistic dummy Week 1 data for training/demo.
    Simulates a user with circadian rhythm patterns.
    """
    np.random.seed(42)
    data = []

    for day in range(num_days):
        # Daily questionnaire values (vary by day)
        sleep_quality = np.random.randint(4, 10)
        stress_level = np.random.randint(2, 8)
        caffeine_intake = np.random.choice([0, 1, 2, 3])
        exercise_today = np.random.choice([0, 1])
        expected_difficulty = np.random.randint(3, 9)

        baseline_typing_speed = 50 + np.random.normal(0, 5)
        baseline_error_rate = 0.05 + np.random.normal(0, 0.01)

        for hour in range(samples_per_day):
            # Circadian rhythm energy curve
            circadian = np.sin((hour - 6) * np.pi / 12) * 0.3 + 0.7
            if hour < 6 or hour > 22:
                circadian *= 0.4  # Low at night

            # Base energy influenced by sleep, stress, etc.
            base_energy = (
                sleep_quality * 5 +
                (10 - stress_level) * 3 +
                exercise_today * 5 +
                caffeine_intake * 3 +
                circadian * 15
            )

            # Session fatigue (increases through the day)
            session_minutes = max(0, (hour - 8) * 15 + np.random.normal(0, 10))
            fatigue = max(0, session_minutes / 180)

            # Calculate actual energy (what the user would report)
            actual_energy = base_energy - fatigue * 15 + np.random.normal(0, 5)
            actual_energy = np.clip(actual_energy, 0, 100)

            # Activity metrics influenced by energy
            typing_speed = baseline_typing_speed * (0.6 + actual_energy / 250) + np.random.normal(0, 3)
            error_rate = baseline_error_rate * (2 - actual_energy / 100) + np.random.normal(0, 0.005)
            error_rate = max(0, error_rate)

            time_since_break = np.random.randint(5, 90)
            tasks_completed = max(0, int(actual_energy / 30 + np.random.normal(0, 0.5)))

            sample = {
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
                'typing_speed_ratio': round(typing_speed / baseline_typing_speed, 3),
                'error_rate_ratio': round(error_rate / max(baseline_error_rate, 0.001), 3),
                'current_energy': round(actual_energy, 1),  # TARGET
            }

            data.append(sample)

    return data


def train_energy_model(training_data):
    """
    Train a LightGBM regressor on the provided training data.
    
    Args:
        training_data: list of dicts with feature names + 'current_energy' target
    
    Returns:
        dict with model, metrics, and feature info
    """
    if not training_data or len(training_data) < 10:
        print("[Training] Not enough data (need at least 10 samples)")
        return None

    df = pd.DataFrame(training_data)
    print(f"[Training] Dataset: {len(df)} samples, {len(FEATURE_NAMES)} features")

    # Prepare features and target
    X = df[FEATURE_NAMES].fillna(0)
    y = df[TARGET_NAME].clip(0, 100)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train LightGBM
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

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
    )

    # Evaluate
    predictions = model.predict(X_test)
    predictions = np.clip(predictions, 0, 100)

    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"[Training] Results:")
    print(f"  MAE:  {mae:.2f}")
    print(f"  R²:   {r2:.4f}")

    # Feature importance
    importance = dict(zip(FEATURE_NAMES, model.feature_importances_.tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"  Top features: {[f[0] for f in top_features]}")

    return {
        'model': model,
        'mae': round(mae, 2),
        'r2': round(r2, 4),
        'num_samples': len(df),
        'feature_names': FEATURE_NAMES,
        'feature_importance': importance,
    }


if __name__ == '__main__':
    print("=" * 50)
    print("FlowState ML Training - Standalone Test")
    print("=" * 50)

    # Generate dummy data
    data = generate_dummy_data(num_days=7)
    print(f"\nGenerated {len(data)} training samples")

    # Train
    result = train_energy_model(data)

    if result:
        print(f"\n[OK] Model trained! MAE={result['mae']}, R2={result['r2']}")
    else:
        print("\n[FAIL] Training failed!")
