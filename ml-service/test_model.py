"""
FlowState - Model Accuracy Testing
====================================
Tests the trained ONNX model with various metrics and scenarios.
Run: python test_model.py
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import onnxruntime as ort
import os
from train_model import train_energy_model, generate_dummy_data, FEATURE_NAMES
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def load_onnx_model(model_path):
    """Load the ONNX model for inference."""
    if not os.path.exists(model_path):
        print(f"[ERROR] Model not found: {model_path}")
        return None
    session = ort.InferenceSession(model_path)
    print(f"[OK] ONNX model loaded: {model_path}")
    print(f"     Input:  {session.get_inputs()[0].name} {session.get_inputs()[0].shape}")
    print(f"     Output: {session.get_outputs()[0].name} {session.get_outputs()[0].shape}")
    return session


def predict_onnx(session, features_dict):
    """Make a single prediction using the ONNX model."""
    values = [float(features_dict.get(f, 0)) for f in FEATURE_NAMES]
    input_array = np.array([values], dtype=np.float32)
    input_name = session.get_inputs()[0].name
    result = session.run(None, {input_name: input_array})
    pred = np.array(result[0]).flatten()
    return float(pred[0])


def predict_batch_onnx(session, data_list):
    """Make batch predictions using the ONNX model."""
    all_values = []
    for features_dict in data_list:
        values = [float(features_dict.get(f, 0)) for f in FEATURE_NAMES]
        all_values.append(values)
    input_array = np.array(all_values, dtype=np.float32)
    input_name = session.get_inputs()[0].name
    result = session.run(None, {input_name: input_array})
    preds = np.array(result[0]).flatten()
    return [float(x) for x in preds]


def test_accuracy(session, test_data):
    """Test model accuracy on a dataset."""
    print("\n" + "=" * 60)
    print("  MODEL ACCURACY REPORT")
    print("=" * 60)

    # Get predictions
    actuals = [d['current_energy'] for d in test_data]
    predictions = predict_batch_onnx(session, test_data)
    predictions_clipped = [max(0, min(100, p)) for p in predictions]

    # --- Core Metrics ---
    mae = mean_absolute_error(actuals, predictions_clipped)
    rmse = np.sqrt(mean_squared_error(actuals, predictions_clipped))
    r2 = r2_score(actuals, predictions_clipped)
    mape = np.mean(np.abs((np.array(actuals) - np.array(predictions_clipped)) / np.clip(np.array(actuals), 1, None))) * 100

    print(f"\n  Samples tested: {len(test_data)}")
    print(f"\n  --- Core Metrics ---")
    print(f"  MAE  (Mean Absolute Error):   {mae:.2f} points")
    print(f"  RMSE (Root Mean Sq Error):     {rmse:.2f} points")
    print(f"  R2   (R-Squared):              {r2:.4f}  (1.0 = perfect)")
    print(f"  MAPE (Mean Abs % Error):       {mape:.1f}%")

    # --- Interpretation ---
    print(f"\n  --- Interpretation ---")
    if mae < 5:
        print(f"  [EXCELLENT] MAE < 5: Predictions are within ~5 energy points")
    elif mae < 10:
        print(f"  [GOOD] MAE < 10: Predictions are within ~10 energy points")
    elif mae < 15:
        print(f"  [FAIR] MAE < 15: Model has moderate accuracy")
    else:
        print(f"  [POOR] MAE >= 15: Model needs more/better training data")

    if r2 > 0.8:
        print(f"  [EXCELLENT] R2 > 0.80: Model explains {r2*100:.1f}% of variance")
    elif r2 > 0.6:
        print(f"  [GOOD] R2 > 0.60: Model explains {r2*100:.1f}% of variance")
    elif r2 > 0.4:
        print(f"  [FAIR] R2 > 0.40: Model explains {r2*100:.1f}% of variance")
    else:
        print(f"  [POOR] R2 < 0.40: Model struggles to explain the data")

    # --- Error Distribution ---
    errors = np.array(actuals) - np.array(predictions_clipped)
    abs_errors = np.abs(errors)

    print(f"\n  --- Error Distribution ---")
    print(f"  Min error:    {abs_errors.min():.2f} points")
    print(f"  Max error:    {abs_errors.max():.2f} points")
    print(f"  Median error: {np.median(abs_errors):.2f} points")
    print(f"  Std dev:      {np.std(errors):.2f} points")

    # Accuracy buckets
    within_5 = np.sum(abs_errors <= 5) / len(abs_errors) * 100
    within_10 = np.sum(abs_errors <= 10) / len(abs_errors) * 100
    within_15 = np.sum(abs_errors <= 15) / len(abs_errors) * 100
    within_20 = np.sum(abs_errors <= 20) / len(abs_errors) * 100

    print(f"\n  --- Accuracy Buckets ---")
    print(f"  Within  5 points: {within_5:.1f}% of predictions")
    print(f"  Within 10 points: {within_10:.1f}% of predictions")
    print(f"  Within 15 points: {within_15:.1f}% of predictions")
    print(f"  Within 20 points: {within_20:.1f}% of predictions")

    return mae, r2


def test_scenarios(session):
    """Test the model with realistic user scenarios."""
    print("\n" + "=" * 60)
    print("  SCENARIO TESTING")
    print("=" * 60)

    scenarios = {
        "Morning - Well Rested": {
            'typing_speed_5min': 60, 'typing_speed_15min': 58,
            'error_rate_5min': 0.02, 'error_rate_15min': 0.025,
            'mouse_entropy': 0.8, 'idle_percentage': 0.1,
            'session_duration': 30, 'time_since_break': 15,
            'tasks_completed_hour': 3, 'hour_of_day': 9,
            'day_of_week': 1, 'sleep_quality': 9,
            'stress_level': 2, 'caffeine_intake': 1,
            'exercise_today': 1, 'expected_difficulty': 4,
            'typing_speed_ratio': 1.1, 'error_rate_ratio': 0.8,
        },
        "Afternoon - Moderate": {
            'typing_speed_5min': 45, 'typing_speed_15min': 47,
            'error_rate_5min': 0.05, 'error_rate_15min': 0.04,
            'mouse_entropy': 0.6, 'idle_percentage': 0.2,
            'session_duration': 120, 'time_since_break': 45,
            'tasks_completed_hour': 2, 'hour_of_day': 14,
            'day_of_week': 3, 'sleep_quality': 6,
            'stress_level': 5, 'caffeine_intake': 2,
            'exercise_today': 0, 'expected_difficulty': 6,
            'typing_speed_ratio': 0.9, 'error_rate_ratio': 1.1,
        },
        "Late Night - Exhausted": {
            'typing_speed_5min': 30, 'typing_speed_15min': 35,
            'error_rate_5min': 0.1, 'error_rate_15min': 0.08,
            'mouse_entropy': 0.3, 'idle_percentage': 0.5,
            'session_duration': 300, 'time_since_break': 80,
            'tasks_completed_hour': 0, 'hour_of_day': 23,
            'day_of_week': 5, 'sleep_quality': 4,
            'stress_level': 8, 'caffeine_intake': 3,
            'exercise_today': 0, 'expected_difficulty': 8,
            'typing_speed_ratio': 0.6, 'error_rate_ratio': 2.0,
        },
        "Post-Break - Refreshed": {
            'typing_speed_5min': 55, 'typing_speed_15min': 50,
            'error_rate_5min': 0.03, 'error_rate_15min': 0.035,
            'mouse_entropy': 0.75, 'idle_percentage': 0.12,
            'session_duration': 5, 'time_since_break': 2,
            'tasks_completed_hour': 2, 'hour_of_day': 11,
            'day_of_week': 2, 'sleep_quality': 7,
            'stress_level': 3, 'caffeine_intake': 1,
            'exercise_today': 1, 'expected_difficulty': 5,
            'typing_speed_ratio': 1.05, 'error_rate_ratio': 0.9,
        },
        "Stressed & Sleep Deprived": {
            'typing_speed_5min': 35, 'typing_speed_15min': 38,
            'error_rate_5min': 0.08, 'error_rate_15min': 0.07,
            'mouse_entropy': 0.4, 'idle_percentage': 0.35,
            'session_duration': 180, 'time_since_break': 60,
            'tasks_completed_hour': 1, 'hour_of_day': 16,
            'day_of_week': 4, 'sleep_quality': 3,
            'stress_level': 9, 'caffeine_intake': 3,
            'exercise_today': 0, 'expected_difficulty': 9,
            'typing_speed_ratio': 0.7, 'error_rate_ratio': 1.8,
        },
    }

    print(f"\n  {'Scenario':<30} {'Predicted Energy':>18}  {'Assessment'}")
    print(f"  {'-'*30} {'-'*18}  {'-'*15}")

    for name, features in scenarios.items():
        score = predict_onnx(session, features)
        score = max(0, min(100, score))

        if score >= 70:
            assessment = "HIGH energy"
        elif score >= 40:
            assessment = "MODERATE"
        else:
            assessment = "LOW energy"

        bar_len = int(score / 5)
        bar = "#" * bar_len + "." * (20 - bar_len)

        print(f"  {name:<30} {score:>10.1f} / 100   {assessment}")
        print(f"  {'':30} [{bar}]")

    print()


def test_feature_sensitivity(session):
    """Test how sensitive the model is to each feature."""
    print("\n" + "=" * 60)
    print("  FEATURE SENSITIVITY ANALYSIS")
    print("=" * 60)

    # Baseline: average values
    baseline = {
        'typing_speed_5min': 50, 'typing_speed_15min': 50,
        'error_rate_5min': 0.05, 'error_rate_15min': 0.05,
        'mouse_entropy': 0.6, 'idle_percentage': 0.2,
        'session_duration': 60, 'time_since_break': 30,
        'tasks_completed_hour': 2, 'hour_of_day': 12,
        'day_of_week': 3, 'sleep_quality': 7,
        'stress_level': 5, 'caffeine_intake': 1,
        'exercise_today': 0, 'expected_difficulty': 5,
        'typing_speed_ratio': 1.0, 'error_rate_ratio': 1.0,
    }

    baseline_score = predict_onnx(session, baseline)

    # Test each feature: set to low vs high
    feature_ranges = {
        'typing_speed_5min': (20, 80),
        'typing_speed_15min': (20, 80),
        'error_rate_5min': (0.01, 0.15),
        'error_rate_15min': (0.01, 0.15),
        'mouse_entropy': (0.1, 0.9),
        'idle_percentage': (0.05, 0.6),
        'session_duration': (5, 300),
        'time_since_break': (5, 90),
        'tasks_completed_hour': (0, 5),
        'hour_of_day': (6, 22),
        'day_of_week': (0, 6),
        'sleep_quality': (3, 9),
        'stress_level': (1, 9),
        'caffeine_intake': (0, 3),
        'exercise_today': (0, 1),
        'expected_difficulty': (2, 9),
        'typing_speed_ratio': (0.5, 1.5),
        'error_rate_ratio': (0.5, 2.5),
    }

    print(f"\n  Baseline prediction: {baseline_score:.1f}")
    print(f"\n  {'Feature':<25} {'Low':>8} {'High':>8} {'Impact':>8}  Direction")
    print(f"  {'-'*25} {'-'*8} {'-'*8} {'-'*8}  {'-'*20}")

    impacts = []
    for feature, (low, high) in feature_ranges.items():
        # Test with low value
        low_input = baseline.copy()
        low_input[feature] = low
        low_score = predict_onnx(session, low_input)

        # Test with high value
        high_input = baseline.copy()
        high_input[feature] = high
        high_score = predict_onnx(session, high_input)

        impact = abs(high_score - low_score)
        direction = "+" if high_score > low_score else "-"
        direction_desc = "Higher = More energy" if high_score > low_score else "Higher = Less energy"

        impacts.append((feature, low_score, high_score, impact, direction_desc))

    # Sort by impact
    impacts.sort(key=lambda x: x[3], reverse=True)

    for feature, low_score, high_score, impact, direction in impacts:
        marker = "***" if impact > 5 else "  *" if impact > 2 else "   "
        print(f"  {feature:<25} {low_score:>7.1f} {high_score:>7.1f} {impact:>7.1f}  {direction} {marker}")

    print(f"\n  *** = High impact (>5 pts)  * = Moderate (>2 pts)")


if __name__ == '__main__':
    print("=" * 60)
    print("  FlowState - Model Accuracy & Testing Suite")
    print("=" * 60)

    # Load model
    model_path = os.path.join('models', 'energy-model.onnx')
    session = load_onnx_model(model_path)
    if not session:
        sys.exit(1)

    # --- Test 1: Accuracy on unseen data ---
    print("\n  Generating unseen test data (different seed)...")
    np.random.seed(99)  # Different seed than training (42)
    test_data = generate_dummy_data(num_days=3, samples_per_day=24)
    test_accuracy(session, test_data)

    # --- Test 2: Scenario predictions ---
    test_scenarios(session)

    # --- Test 3: Feature sensitivity ---
    test_feature_sensitivity(session)

    print("\n" + "=" * 60)
    print("  Testing complete!")
    print("=" * 60)
