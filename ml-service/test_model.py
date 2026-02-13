"""
FlowState - Pipeline Model Testing Suite
==========================================
Tests all 3 ONNX models with accuracy metrics, scenarios, and pipeline flow.

Run: python test_model.py
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import onnxruntime as ort
import os
from train_model import (
    train_all_models, generate_dummy_data,
    ENERGY_FEATURE_NAMES, BREAK_FEATURE_NAMES, TASK_SWITCH_FEATURE_NAMES
)
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ==============================================================================
# ONNX HELPERS
# ==============================================================================

def load_onnx_model(model_path, name="model"):
    """Load an ONNX model for inference."""
    if not os.path.exists(model_path):
        print(f"  [SKIP] {name} not found: {model_path}")
        return None
    session = ort.InferenceSession(model_path)
    print(f"  [OK] {name} loaded: {model_path}")
    print(f"       Input:  {session.get_inputs()[0].name} {session.get_inputs()[0].shape}")
    print(f"       Output: {session.get_outputs()[0].name} {session.get_outputs()[0].shape}")
    return session


def predict_regressor(session, features_dict, feature_names):
    """Single regressor prediction."""
    values = [float(features_dict.get(f, 0)) for f in feature_names]
    input_array = np.array([values], dtype=np.float32)
    input_name = session.get_inputs()[0].name
    result = session.run(None, {input_name: input_array})
    return float(np.array(result[0]).flatten()[0])


def predict_classifier(session, features_dict, feature_names):
    """Single classifier prediction. Returns probability of class 1."""
    values = [float(features_dict.get(f, 0)) for f in feature_names]
    input_array = np.array([values], dtype=np.float32)
    input_name = session.get_inputs()[0].name
    result = session.run(None, {input_name: input_array})
    output = result[0]
    if len(output.shape) > 1 and output.shape[1] > 1:
        return float(output[0][1])
    return float(output.flatten()[0])


def predict_batch_regressor(session, data_list, feature_names):
    """Batch regressor predictions."""
    all_values = []
    for d in data_list:
        values = [float(d.get(f, 0)) for f in feature_names]
        all_values.append(values)
    input_array = np.array(all_values, dtype=np.float32)
    input_name = session.get_inputs()[0].name
    result = session.run(None, {input_name: input_array})
    return [float(x) for x in np.array(result[0]).flatten()]


# ==============================================================================
# TEST 1: ENERGY MODEL ACCURACY
# ==============================================================================

def test_energy_accuracy(session, test_data):
    """Test energy model accuracy on unseen data."""
    print(f"\n{'='*60}")
    print(f"  TEST 1: ENERGY MODEL ACCURACY")
    print(f"{'='*60}")

    actuals = [d['current_energy'] for d in test_data]
    predictions = predict_batch_regressor(session, test_data, ENERGY_FEATURE_NAMES)
    predictions_clipped = [max(0, min(100, p)) for p in predictions]

    mae = mean_absolute_error(actuals, predictions_clipped)
    rmse = np.sqrt(mean_squared_error(actuals, predictions_clipped))
    r2 = r2_score(actuals, predictions_clipped)
    mape = np.mean(np.abs((np.array(actuals) - np.array(predictions_clipped)) /
                          np.clip(np.array(actuals), 1, None))) * 100

    print(f"\n  Samples: {len(test_data)}")
    print(f"  MAE:  {mae:.2f}  |  RMSE: {rmse:.2f}")
    print(f"  R²:   {r2:.4f}  |  MAPE: {mape:.1f}%")

    if mae < 5:
        print(f"  [EXCELLENT] MAE < 5")
    elif mae < 10:
        print(f"  [GOOD] MAE < 10")
    elif mae < 15:
        print(f"  [FAIR] MAE < 15")
    else:
        print(f"  [POOR] MAE >= 15")

    errors = np.abs(np.array(actuals) - np.array(predictions_clipped))
    within_5 = np.sum(errors <= 5) / len(errors) * 100
    within_10 = np.sum(errors <= 10) / len(errors) * 100
    print(f"  Within  5 pts: {within_5:.1f}%  |  Within 10 pts: {within_10:.1f}%")

    return mae, r2


# ==============================================================================
# TEST 2: BREAK MODEL ACCURACY
# ==============================================================================

def test_break_accuracy(session, test_data, threshold=0.5):
    """Test break suggestion model accuracy."""
    print(f"\n{'='*60}")
    print(f"  TEST 2: BREAK MODEL ACCURACY")
    print(f"{'='*60}")

    actuals = [d['break_target'] for d in test_data]
    proba_list = []
    for d in test_data:
        p = predict_classifier(session, d, BREAK_FEATURE_NAMES)
        proba_list.append(p)

    predictions = [1 if p >= threshold else 0 for p in proba_list]

    # Metrics
    tp = sum(1 for a, p in zip(actuals, predictions) if a == 1 and p == 1)
    fp = sum(1 for a, p in zip(actuals, predictions) if a == 0 and p == 1)
    fn = sum(1 for a, p in zip(actuals, predictions) if a == 1 and p == 0)
    tn = sum(1 for a, p in zip(actuals, predictions) if a == 0 and p == 0)

    accuracy = (tp + tn) / len(actuals) * 100
    precision = tp / (tp + fp) * 100 if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) * 100 if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall + 1e-10)

    print(f"\n  Samples: {len(test_data)}  |  Threshold: {threshold:.3f}")
    print(f"  Accuracy:  {accuracy:.1f}%")
    print(f"  Precision: {precision:.1f}%  |  Recall: {recall:.1f}%")
    print(f"  F1 Score:  {f1:.1f}%")
    print(f"  TP: {tp}  FP: {fp}  FN: {fn}  TN: {tn}")

    # Distribution of probabilities
    pos_probs = [p for p, a in zip(proba_list, actuals) if a == 1]
    neg_probs = [p for p, a in zip(proba_list, actuals) if a == 0]
    print(f"\n  Avg prob (positive): {np.mean(pos_probs):.3f}" if pos_probs else "")
    print(f"  Avg prob (negative): {np.mean(neg_probs):.3f}" if neg_probs else "")

    return accuracy, f1


# ==============================================================================
# TEST 3: TASK SWITCH MODEL ACCURACY
# ==============================================================================

def test_task_switch_accuracy(session, test_data, threshold=0.5):
    """Test task switch model accuracy."""
    print(f"\n{'='*60}")
    print(f"  TEST 3: TASK SWITCH MODEL ACCURACY")
    print(f"{'='*60}")

    actuals = [d['task_switch_target'] for d in test_data]
    proba_list = []
    for d in test_data:
        p = predict_classifier(session, d, TASK_SWITCH_FEATURE_NAMES)
        proba_list.append(p)

    predictions = [1 if p >= threshold else 0 for p in proba_list]

    tp = sum(1 for a, p in zip(actuals, predictions) if a == 1 and p == 1)
    fp = sum(1 for a, p in zip(actuals, predictions) if a == 0 and p == 1)
    fn = sum(1 for a, p in zip(actuals, predictions) if a == 1 and p == 0)
    tn = sum(1 for a, p in zip(actuals, predictions) if a == 0 and p == 0)

    accuracy = (tp + tn) / len(actuals) * 100
    precision = tp / (tp + fp) * 100 if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) * 100 if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall + 1e-10)

    print(f"\n  Samples: {len(test_data)}  |  Threshold: {threshold:.3f}")
    print(f"  Accuracy:  {accuracy:.1f}%")
    print(f"  Precision: {precision:.1f}%  |  Recall: {recall:.1f}%")
    print(f"  F1 Score:  {f1:.1f}%")
    print(f"  TP: {tp}  FP: {fp}  FN: {fn}  TN: {tn}")

    return accuracy, f1


# ==============================================================================
# TEST 4: PIPELINE SCENARIO TESTING
# ==============================================================================

def test_pipeline_scenarios(energy_session, break_session, switch_session):
    """Test full pipeline with realistic scenarios."""
    print(f"\n{'='*60}")
    print(f"  TEST 4: FULL PIPELINE SCENARIOS")
    print(f"{'='*60}")

    scenarios = {
        "Morning - Well Rested, Easy Task": {
            # Activity
            'typing_speed_5min': 60, 'typing_speed_15min': 58,
            'error_rate_5min': 0.02, 'error_rate_15min': 0.025,
            'mouse_entropy': 0.8, 'idle_percentage': 0.1,
            'session_duration': 30, 'time_since_break': 15,
            'tasks_completed_hour': 3, 'hour_of_day': 9, 'day_of_week': 1,
            'sleep_quality': 9, 'stress_level': 2, 'caffeine_intake': 1,
            'exercise_today': 1, 'expected_difficulty': 4,
            'typing_speed_ratio': 1.1, 'error_rate_ratio': 0.8,
            # Break context
            'velocity_5min': 58, 'velocity_15min': 56, 'velocity_trend': 1,
            'deep_work_indicator': 1, 'task_switches_last_hour': 0,
            'user_avg_session_length': 90, 'historical_acceptance_rate': 0.5,
            'minutes_since_last_prompt': 60, 'last_prompt_accepted': 1,
            'prompts_dismissed_streak': 0,
            # Task context
            'current_task_complexity': 0, 'current_task_duration': 15,
            'current_task_progress': 0.3, 'current_task_error_rate': 0.02,
            'task_is_stuck': 0, 'num_low_complexity_available': 3,
            'num_high_complexity_available': 2, 'has_urgent_simple_task': 0,
            'user_switch_frequency': 0.2, 'recent_task_switch': 0,
            'task_has_dependencies': 0,
        },
        "Long Session, Declining Energy": {
            'typing_speed_5min': 38, 'typing_speed_15min': 42,
            'error_rate_5min': 0.07, 'error_rate_15min': 0.06,
            'mouse_entropy': 0.45, 'idle_percentage': 0.3,
            'session_duration': 150, 'time_since_break': 75,
            'tasks_completed_hour': 1, 'hour_of_day': 15, 'day_of_week': 3,
            'sleep_quality': 5, 'stress_level': 7, 'caffeine_intake': 2,
            'exercise_today': 0, 'expected_difficulty': 7,
            'typing_speed_ratio': 0.75, 'error_rate_ratio': 1.6,
            'velocity_5min': 32, 'velocity_15min': 38, 'velocity_trend': -1,
            'deep_work_indicator': 0, 'task_switches_last_hour': 1,
            'user_avg_session_length': 90, 'historical_acceptance_rate': 0.6,
            'minutes_since_last_prompt': 40, 'last_prompt_accepted': 0,
            'prompts_dismissed_streak': 1,
            'current_task_complexity': 2, 'current_task_duration': 45,
            'current_task_progress': 0.2, 'current_task_error_rate': 0.09,
            'task_is_stuck': 1, 'num_low_complexity_available': 4,
            'num_high_complexity_available': 1, 'has_urgent_simple_task': 1,
            'user_switch_frequency': 0.3, 'recent_task_switch': 0,
            'task_has_dependencies': 0,
        },
        "Post-Break, Fresh Start": {
            'typing_speed_5min': 55, 'typing_speed_15min': 50,
            'error_rate_5min': 0.03, 'error_rate_15min': 0.035,
            'mouse_entropy': 0.75, 'idle_percentage': 0.12,
            'session_duration': 5, 'time_since_break': 2,
            'tasks_completed_hour': 2, 'hour_of_day': 11, 'day_of_week': 2,
            'sleep_quality': 7, 'stress_level': 3, 'caffeine_intake': 1,
            'exercise_today': 1, 'expected_difficulty': 5,
            'typing_speed_ratio': 1.05, 'error_rate_ratio': 0.9,
            'velocity_5min': 52, 'velocity_15min': 48, 'velocity_trend': 1,
            'deep_work_indicator': 0, 'task_switches_last_hour': 0,
            'user_avg_session_length': 90, 'historical_acceptance_rate': 0.5,
            'minutes_since_last_prompt': 90, 'last_prompt_accepted': 1,
            'prompts_dismissed_streak': 0,
            'current_task_complexity': 1, 'current_task_duration': 5,
            'current_task_progress': 0.05, 'current_task_error_rate': 0.03,
            'task_is_stuck': 0, 'num_low_complexity_available': 3,
            'num_high_complexity_available': 2, 'has_urgent_simple_task': 0,
            'user_switch_frequency': 0.2, 'recent_task_switch': 0,
            'task_has_dependencies': 0,
        },
        "Late Night, Exhausted, Hard Task": {
            'typing_speed_5min': 28, 'typing_speed_15min': 32,
            'error_rate_5min': 0.12, 'error_rate_15min': 0.1,
            'mouse_entropy': 0.25, 'idle_percentage': 0.5,
            'session_duration': 300, 'time_since_break': 90,
            'tasks_completed_hour': 0, 'hour_of_day': 23, 'day_of_week': 5,
            'sleep_quality': 3, 'stress_level': 9, 'caffeine_intake': 3,
            'exercise_today': 0, 'expected_difficulty': 9,
            'typing_speed_ratio': 0.55, 'error_rate_ratio': 2.2,
            'velocity_5min': 20, 'velocity_15min': 25, 'velocity_trend': -1,
            'deep_work_indicator': 0, 'task_switches_last_hour': 0,
            'user_avg_session_length': 90, 'historical_acceptance_rate': 0.4,
            'minutes_since_last_prompt': 50, 'last_prompt_accepted': 0,
            'prompts_dismissed_streak': 3,
            'current_task_complexity': 2, 'current_task_duration': 90,
            'current_task_progress': 0.15, 'current_task_error_rate': 0.15,
            'task_is_stuck': 1, 'num_low_complexity_available': 2,
            'num_high_complexity_available': 0, 'has_urgent_simple_task': 1,
            'user_switch_frequency': 0.1, 'recent_task_switch': 0,
            'task_has_dependencies': 0,
        },
        "Deep Focus Flow State": {
            'typing_speed_5min': 65, 'typing_speed_15min': 63,
            'error_rate_5min': 0.015, 'error_rate_15min': 0.02,
            'mouse_entropy': 0.85, 'idle_percentage': 0.05,
            'session_duration': 60, 'time_since_break': 40,
            'tasks_completed_hour': 4, 'hour_of_day': 10, 'day_of_week': 2,
            'sleep_quality': 8, 'stress_level': 2, 'caffeine_intake': 1,
            'exercise_today': 1, 'expected_difficulty': 7,
            'typing_speed_ratio': 1.25, 'error_rate_ratio': 0.5,
            'velocity_5min': 64, 'velocity_15min': 62, 'velocity_trend': 1,
            'deep_work_indicator': 1, 'task_switches_last_hour': 0,
            'user_avg_session_length': 120, 'historical_acceptance_rate': 0.3,
            'minutes_since_last_prompt': 120, 'last_prompt_accepted': 0,
            'prompts_dismissed_streak': 0,
            'current_task_complexity': 2, 'current_task_duration': 45,
            'current_task_progress': 0.6, 'current_task_error_rate': 0.02,
            'task_is_stuck': 0, 'num_low_complexity_available': 2,
            'num_high_complexity_available': 1, 'has_urgent_simple_task': 0,
            'user_switch_frequency': 0.1, 'recent_task_switch': 0,
            'task_has_dependencies': 0,
        },
    }

    header = f"  {'Scenario':<35} {'Energy':>7} {'Break?':>7} {'Switch?':>8}"
    print(f"\n{header}")
    print(f"  {'-'*35} {'-'*7} {'-'*7} {'-'*8}")

    for name, features in scenarios.items():
        enriched = dict(features)

        # Step 1: Energy
        energy = "--"
        if energy_session:
            score = predict_regressor(energy_session, enriched, ENERGY_FEATURE_NAMES)
            score = max(0, min(100, score))
            energy = f"{score:.0f}"
            enriched['predicted_energy'] = score

        # Step 2: Break
        break_str = "--"
        break_conf = 0
        if break_session:
            prob = predict_classifier(break_session, enriched, BREAK_FEATURE_NAMES)
            break_conf = prob
            break_str = f"{'YES' if prob >= 0.5 else 'no'} ({prob:.2f})"
            enriched['break_suggestion_prob'] = prob

        # Step 3: Task Switch
        switch_str = "--"
        if switch_session:
            prob = predict_classifier(switch_session, enriched, TASK_SWITCH_FEATURE_NAMES)
            switch_str = f"{'YES' if prob >= 0.5 else 'no'} ({prob:.2f})"

        print(f"  {name:<35} {energy:>7} {break_str:>12} {switch_str:>14}")

    print()


# ==============================================================================
# MAIN
# ==============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("  FlowState - Pipeline Model Testing Suite")
    print("=" * 60)

    # Load all models
    print("\n  Loading models...")
    energy_path = os.path.join('models', 'energy-model.onnx')
    break_path = os.path.join('models', 'break-model.onnx')
    switch_path = os.path.join('models', 'task-switch-model.onnx')

    energy_session = load_onnx_model(energy_path, "Energy Model")
    break_session = load_onnx_model(break_path, "Break Model")
    switch_session = load_onnx_model(switch_path, "Task Switch Model")

    if not energy_session:
        print("\n  [ERROR] Energy model is required. Train models first!")
        print("  Run: python export_onnx.py")
        sys.exit(1)

    # Generate unseen test data (different seed)
    print("\n  Generating unseen test data (seed=99)...")
    np.random.seed(99)
    test_data = generate_dummy_data(num_days=3, samples_per_day=24)

    # Test 1: Energy accuracy
    test_energy_accuracy(energy_session, test_data)

    # Test 2: Break model accuracy
    if break_session:
        test_break_accuracy(break_session, test_data)
    else:
        print(f"\n  [SKIP] Break model not found")

    # Test 3: Task switch accuracy
    if switch_session:
        test_task_switch_accuracy(switch_session, test_data)
    else:
        print(f"\n  [SKIP] Task switch model not found")

    # Test 4: Pipeline scenarios
    test_pipeline_scenarios(energy_session, break_session, switch_session)

    print("=" * 60)
    print("  Testing complete!")
    print("=" * 60)
