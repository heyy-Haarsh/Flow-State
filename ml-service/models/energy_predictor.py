"""
FlowState - Energy Predictor Model
====================================
Model architecture and prediction utilities.
"""

import numpy as np
import onnxruntime as ort

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


class EnergyPredictorModel:
    """Wrapper for energy prediction using ONNX model."""

    def __init__(self):
        self.session = None

    def load(self, model_path):
        """Load an ONNX model for inference."""
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

        # Convert dict to ordered numpy array
        feature_values = [float(features_dict.get(f, 0)) for f in FEATURE_NAMES]
        input_array = np.array([feature_values], dtype=np.float32)

        # Get input name from model
        input_name = self.session.get_inputs()[0].name

        # Run inference
        result = self.session.run(None, {input_name: input_array})
        prediction = float(result[0][0])

        # Clamp to 0-100
        return round(max(0, min(100, prediction)), 1)

    def predict_batch(self, model_path, features_list):
        """
        Make predictions for multiple feature sets.
        
        Args:
            model_path: Path to ONNX model
            features_list: List of feature dicts
        
        Returns:
            List of predicted energy scores
        """
        if self.session is None:
            self.load(model_path)

        input_arrays = []
        for features_dict in features_list:
            values = [float(features_dict.get(f, 0)) for f in FEATURE_NAMES]
            input_arrays.append(values)

        input_batch = np.array(input_arrays, dtype=np.float32)
        input_name = self.session.get_inputs()[0].name

        result = self.session.run(None, {input_name: input_batch})
        predictions = result[0].flatten().tolist()

        return [round(max(0, min(100, p)), 1) for p in predictions]
