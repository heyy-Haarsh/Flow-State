"""
FlowState - Pipeline Predictor (ONNX inference for all 3 models)
=================================================================
Provides ONNX-based inference for:
  1. Energy Prediction (Regressor)
  2. Break Suggestion (Classifier)
  3. Task Switch Recommendation (Classifier)
"""

import numpy as np
import onnxruntime as ort
import os


# Feature ordering must match training exactly
ENERGY_FEATURE_NAMES = [
    'typing_speed_5min', 'typing_speed_15min',
    'error_rate_5min', 'error_rate_15min',
    'mouse_entropy', 'idle_percentage',
    'session_duration', 'time_since_break',
    'tasks_completed_hour', 'hour_of_day', 'day_of_week',
    'sleep_quality', 'stress_level', 'caffeine_intake',
    'exercise_today', 'expected_difficulty',
    'typing_speed_ratio', 'error_rate_ratio',
]

BREAK_FEATURE_NAMES = [
    'typing_speed_5min', 'typing_speed_15min',
    'typing_speed_ratio',
    'error_rate_5min', 'error_rate_15min',
    'error_rate_ratio',
    'mouse_entropy', 'idle_percentage',
    'time_since_break', 'session_duration',
    'hour_of_day', 'day_of_week',
    'velocity_5min', 'velocity_15min', 'velocity_trend',
    'predicted_energy',
    'tasks_completed_hour', 'task_switches_last_hour',
    'deep_work_indicator',
    'user_avg_session_length', 'historical_acceptance_rate',
    'minutes_since_last_prompt', 'last_prompt_accepted',
    'prompts_dismissed_streak',
]

TASK_SWITCH_FEATURE_NAMES = [
    'current_task_complexity', 'current_task_duration',
    'current_task_progress', 'current_task_error_rate',
    'task_is_stuck',
    'num_low_complexity_available', 'num_high_complexity_available',
    'has_urgent_simple_task',
    'typing_speed_ratio', 'error_rate_ratio',
    'session_duration', 'time_since_break', 'idle_percentage',
    'predicted_energy', 'break_suggestion_prob',
    'velocity_15min', 'velocity_trend',
    'user_switch_frequency',
    'deep_work_indicator', 'recent_task_switch',
    'task_has_dependencies',
]

# Backward compatibility alias
FEATURE_NAMES = ENERGY_FEATURE_NAMES


class EnergyPredictorModel:
    """Wrapper for energy prediction using ONNX model."""

    def __init__(self):
        self.session = None

    def load(self, model_path):
        self.session = ort.InferenceSession(model_path)

    def predict_from_onnx(self, model_path, features_dict):
        """
        Make a prediction from a features dictionary.
        
        Args:
            model_path: Path to ONNX model
            features_dict: Dict with feature names as keys
        
        Returns:
            Predicted energy score (0-100)
        """
        if self.session is None:
            self.load(model_path)

        feature_values = [float(features_dict.get(f, 0)) for f in ENERGY_FEATURE_NAMES]
        input_array = np.array([feature_values], dtype=np.float32)
        input_name = self.session.get_inputs()[0].name

        result = self.session.run(None, {input_name: input_array})
        prediction = float(result[0][0])

        return round(max(0, min(100, prediction)), 1)

    def predict_batch(self, model_path, features_list):
        """Make predictions for multiple feature sets."""
        if self.session is None:
            self.load(model_path)

        input_arrays = []
        for features_dict in features_list:
            values = [float(features_dict.get(f, 0)) for f in ENERGY_FEATURE_NAMES]
            input_arrays.append(values)

        input_batch = np.array(input_arrays, dtype=np.float32)
        input_name = self.session.get_inputs()[0].name

        result = self.session.run(None, {input_name: input_batch})
        predictions = result[0].flatten().tolist()

        return [round(max(0, min(100, p)), 1) for p in predictions]


class BreakSuggestionModel:
    """Wrapper for break suggestion using ONNX model."""

    def __init__(self):
        self.session = None
        self.threshold = 0.5  # Updated from metadata

    def load(self, model_path, threshold=0.5):
        self.session = ort.InferenceSession(model_path)
        self.threshold = threshold

    def predict(self, model_path, features_dict, threshold=None):
        """
        Predict if a break should be suggested.
        
        Args:
            model_path: Path to ONNX model
            features_dict: Dict with feature names as keys
            threshold: Optional override for decision threshold
        
        Returns:
            (should_suggest: bool, confidence: float)
        """
        if self.session is None:
            self.load(model_path)

        if threshold is not None:
            self.threshold = threshold

        feature_values = [float(features_dict.get(f, 0)) for f in BREAK_FEATURE_NAMES]
        input_array = np.array([feature_values], dtype=np.float32)
        input_name = self.session.get_inputs()[0].name

        result = self.session.run(None, {input_name: input_array})

        # Classifier output: probabilities for [class_0, class_1]
        output = result[0]
        if len(output.shape) > 1 and output.shape[1] > 1:
            proba = float(output[0][1])
        else:
            proba = float(output.flatten()[0])

        should_suggest = proba >= self.threshold
        return should_suggest, round(proba, 3)


class TaskSwitchModel:
    """Wrapper for task switch recommendation using ONNX model."""

    def __init__(self):
        self.session = None
        self.threshold = 0.5

    def load(self, model_path, threshold=0.5):
        self.session = ort.InferenceSession(model_path)
        self.threshold = threshold

    def predict(self, model_path, features_dict, threshold=None):
        """
        Predict if a task switch should be suggested.
        
        Args:
            model_path: Path to ONNX model
            features_dict: Dict with feature names as keys
            threshold: Optional override
        
        Returns:
            (should_suggest: bool, confidence: float)
        """
        if self.session is None:
            self.load(model_path)

        if threshold is not None:
            self.threshold = threshold

        feature_values = [float(features_dict.get(f, 0)) for f in TASK_SWITCH_FEATURE_NAMES]
        input_array = np.array([feature_values], dtype=np.float32)
        input_name = self.session.get_inputs()[0].name

        result = self.session.run(None, {input_name: input_array})

        output = result[0]
        if len(output.shape) > 1 and output.shape[1] > 1:
            proba = float(output[0][1])
        else:
            proba = float(output.flatten()[0])

        should_suggest = proba >= self.threshold
        return should_suggest, round(proba, 3)


class PipelinePredictor:
    """
    Unified pipeline predictor that chains all 3 models.
    
    Flow:
        features → [Energy] → energy_score
                → [Break]  → should_break (uses energy_score)
                → [Switch] → should_switch (uses energy + break_prob)
    """

    def __init__(self, models_dir=None):
        self.energy_model = EnergyPredictorModel()
        self.break_model = BreakSuggestionModel()
        self.task_switch_model = TaskSwitchModel()
        self.models_dir = models_dir or os.path.join(os.path.dirname(__file__))
        self.is_loaded = False

    def load_all(self, models_dir=None):
        """Load all ONNX models from directory."""
        models_dir = models_dir or self.models_dir
        loaded = 0

        energy_path = os.path.join(models_dir, 'energy-model.onnx')
        if os.path.exists(energy_path):
            self.energy_model.load(energy_path)
            loaded += 1

        break_path = os.path.join(models_dir, 'break-model.onnx')
        if os.path.exists(break_path):
            # Load threshold from metadata if available
            threshold = self._get_threshold(models_dir, 'break_suggestion')
            self.break_model.load(break_path, threshold)
            loaded += 1

        switch_path = os.path.join(models_dir, 'task-switch-model.onnx')
        if os.path.exists(switch_path):
            threshold = self._get_threshold(models_dir, 'task_switch')
            self.task_switch_model.load(switch_path, threshold)
            loaded += 1

        self.is_loaded = loaded > 0
        return loaded

    def _get_threshold(self, models_dir, model_key, default=0.5):
        """Read threshold from pipeline metadata."""
        meta_path = os.path.join(models_dir, 'pipeline_metadata.json')
        if os.path.exists(meta_path):
            import json
            with open(meta_path, 'r') as f:
                meta = json.load(f)
            return meta.get('models', {}).get(model_key, {}).get('threshold', default)
        return default

    def predict_pipeline(self, features):
        """
        Run full pipeline prediction.
        
        Args:
            features: dict of raw feature values
        
        Returns:
            dict with energy_score, break suggestion, task switch recommendation
        """
        result = {
            'energy_score': None,
            'should_suggest_break': False,
            'break_confidence': 0.0,
            'should_suggest_switch': False,
            'switch_confidence': 0.0,
        }

        models_dir = self.models_dir
        enriched = dict(features)

        # Step 1: Energy
        energy_path = os.path.join(models_dir, 'energy-model.onnx')
        if os.path.exists(energy_path) and self.energy_model.session:
            score = self.energy_model.predict_from_onnx(energy_path, enriched)
            result['energy_score'] = score
            enriched['predicted_energy'] = score

        # Step 2: Break
        break_path = os.path.join(models_dir, 'break-model.onnx')
        if os.path.exists(break_path) and self.break_model.session:
            should_break, conf = self.break_model.predict(break_path, enriched)
            result['should_suggest_break'] = should_break
            result['break_confidence'] = conf
            enriched['break_suggestion_prob'] = conf

        # Step 3: Task Switch
        switch_path = os.path.join(models_dir, 'task-switch-model.onnx')
        if os.path.exists(switch_path) and self.task_switch_model.session:
            should_switch, conf = self.task_switch_model.predict(switch_path, enriched)
            result['should_suggest_switch'] = should_switch
            result['switch_confidence'] = conf

        return result
