"""
FlowState ML Training Service - Flask API (Multi-Model Pipeline)
=================================================================
Endpoints:
  POST /train            - Train all 3 models from shared data
  POST /predict          - Run full pipeline prediction
  POST /predict/energy   - Energy prediction only
  POST /predict/break    - Break suggestion only
  POST /predict/switch   - Task switch recommendation only
  GET  /status           - Get all model statuses
  GET  /health           - Health check
  GET  /model/download/<name>  - Download specific ONNX model

On startup, this server automatically loads any existing ONNX models
from the models/ directory so that /predict works immediately.
If no models are found, it auto-trains with dummy data.
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from train_model import (
    train_all_models, train_energy_model,
    generate_dummy_data,
    ENERGY_FEATURE_NAMES, BREAK_FEATURE_NAMES, TASK_SWITCH_FEATURE_NAMES
)
from export_onnx import export_to_onnx, export_all_models
import os
import json
import numpy as np
import onnxruntime as ort

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# ==============================================================================
# MODEL REGISTRY
# ==============================================================================
# Holds ONNX sessions (loaded from disk) and/or raw LightGBM models (from /train)

_onnx_sessions = {}       # {'energy': ort.InferenceSession, ...}
_lgbm_models = {}         # {'energy': lgb_model, ...}  (from /train, optional)
_model_thresholds = {     # Default thresholds, overridden by metadata
    'break_suggestion': 0.5,
    'task_switch': 0.5,
}
_pipeline_metadata = None  # Loaded from pipeline_metadata.json

# Model file mapping
MODEL_FILES = {
    'energy': 'energy-model.onnx',
    'break_suggestion': 'break-model.onnx',
    'task_switch': 'task-switch-model.onnx',
}

# Feature lists per model
MODEL_FEATURES = {
    'energy': ENERGY_FEATURE_NAMES,
    'break_suggestion': BREAK_FEATURE_NAMES,
    'task_switch': TASK_SWITCH_FEATURE_NAMES,
}


def _load_onnx_models():
    """
    Load all available ONNX models from disk into onnxruntime sessions.
    Called once on startup.
    """
    global _onnx_sessions, _model_thresholds, _pipeline_metadata

    # Load pipeline metadata for thresholds
    metadata_path = os.path.join(MODELS_DIR, 'pipeline_metadata.json')
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r') as f:
                _pipeline_metadata = json.load(f)
            print(f"[Startup] Loaded pipeline metadata")

            # Extract thresholds from metadata
            models_meta = _pipeline_metadata.get('models', {})
            if 'break_suggestion' in models_meta:
                _model_thresholds['break_suggestion'] = models_meta['break_suggestion'].get('threshold', 0.5)
            if 'task_switch' in models_meta:
                _model_thresholds['task_switch'] = models_meta['task_switch'].get('threshold', 0.5)

            print(f"[Startup] Thresholds: break={_model_thresholds['break_suggestion']}, "
                  f"switch={_model_thresholds['task_switch']}")
        except Exception as e:
            print(f"[Startup] Failed to load metadata: {e}")

    # Load each ONNX model
    loaded = 0
    for key, filename in MODEL_FILES.items():
        model_path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(model_path):
            try:
                session = ort.InferenceSession(model_path)
                _onnx_sessions[key] = session
                file_size = os.path.getsize(model_path) / 1024
                print(f"[Startup] Loaded {key} model: {filename} ({file_size:.1f} KB)")
                loaded += 1
            except Exception as e:
                print(f"[Startup] Failed to load {key} model: {e}")
        else:
            print(f"[Startup] No {key} model found at {model_path}")

    print(f"[Startup] Loaded {loaded}/{len(MODEL_FILES)} ONNX models")
    return loaded


def _onnx_predict(session, features, feature_names):
    """
    Run inference on an ONNX session with the given features.
    
    Returns:
        For regressors: float (predicted value)
        For classifiers: (predicted_class, probability_of_class_1)
    """
    # Build feature vector in the correct order
    feature_values = []
    for fname in feature_names:
        feature_values.append(float(features.get(fname, 0.0)))

    input_array = np.array([feature_values], dtype=np.float32)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_array})

    # Determine output type
    output = outputs[0]

    # Check if there's a second output (probabilities for classifiers)
    if len(outputs) > 1:
        # LightGBM classifiers exported via onnxmltools produce:
        #   outputs[0] = predicted labels
        #   outputs[1] = probabilities  [{0: prob0, 1: prob1}]
        probas = outputs[1]
        if isinstance(probas, list) and len(probas) > 0 and isinstance(probas[0], dict):
            prob_class_1 = float(probas[0].get(1, 0.0))
        elif isinstance(probas, np.ndarray):
            if len(probas.shape) > 1 and probas.shape[1] > 1:
                prob_class_1 = float(probas[0][1])
            else:
                prob_class_1 = float(probas.flatten()[0])
        else:
            prob_class_1 = 0.0
        return ('classifier', prob_class_1)

    # Single output - regressor
    value = float(output.flatten()[0])
    return ('regressor', value)


def _is_model_available(key):
    """Check if a model is available (either ONNX or LightGBM in-memory)."""
    return key in _onnx_sessions or key in _lgbm_models


def _auto_train_if_needed():
    """
    If no ONNX models are found on disk, auto-train with dummy data
    so the server is immediately functional.
    """
    if len(_onnx_sessions) > 0:
        print(f"[Startup] Models already loaded, skipping auto-train")
        return

    print(f"[Startup] No ONNX models found — auto-training with dummy data...")
    try:
        training_data = generate_dummy_data(num_days=7)
        results = train_all_models(training_data)

        if results is None:
            print("[Startup] Auto-train failed!")
            return

        # Cache LightGBM models
        for key in ['energy', 'break_suggestion', 'task_switch']:
            if results.get(key) and results[key].get('model'):
                _lgbm_models[key] = results[key]

        # Export to ONNX
        exported = export_all_models(results, models_dir=MODELS_DIR)

        # Save metadata
        _save_pipeline_metadata(results)

        # Now load the ONNX models we just exported
        _load_onnx_models()

        print(f"[Startup] Auto-train complete! Exported: {list(exported.keys())}")

    except Exception as e:
        print(f"[Startup] Auto-train error: {e}")
        import traceback
        traceback.print_exc()


def _save_pipeline_metadata(results):
    """Save pipeline metadata (thresholds, metrics, etc.) to disk."""
    metadata = {
        'pipeline_version': 'v1.0',
        'models': {},
    }

    if results.get('energy'):
        metadata['models']['energy'] = {
            'mae': results['energy']['mae'],
            'r2': results['energy']['r2'],
            'feature_count': len(results['energy']['feature_names']),
            'feature_names': results['energy']['feature_names'],
            'training_samples': results['energy']['num_samples'],
        }

    if results.get('break_suggestion'):
        metadata['models']['break_suggestion'] = {
            'auc': results['break_suggestion']['auc'],
            'f1': results['break_suggestion']['f1'],
            'threshold': results['break_suggestion']['threshold'],
            'feature_count': len(results['break_suggestion']['feature_names']),
            'feature_names': results['break_suggestion']['feature_names'],
            'training_samples': results['break_suggestion']['num_samples'],
        }

    if results.get('task_switch'):
        metadata['models']['task_switch'] = {
            'auc': results['task_switch']['auc'],
            'f1': results['task_switch']['f1'],
            'threshold': results['task_switch']['threshold'],
            'feature_count': len(results['task_switch']['feature_names']),
            'feature_names': results['task_switch']['feature_names'],
            'training_samples': results['task_switch']['num_samples'],
        }

    # Also save backward-compatible single-model metadata
    if results.get('energy'):
        compat_metadata = {
            'mae': results['energy']['mae'],
            'r2': results['energy']['r2'],
            'feature_count': len(results['energy']['feature_names']),
            'feature_names': results['energy']['feature_names'],
            'training_samples': results['energy']['num_samples'],
        }
        with open(os.path.join(MODELS_DIR, 'model_metadata.json'), 'w') as f:
            json.dump(compat_metadata, f, indent=2)

    with open(os.path.join(MODELS_DIR, 'pipeline_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)

    return metadata


# ==============================================================================
# ROUTES
# ==============================================================================

@app.route('/health', methods=['GET'])
def health():
    models_loaded = {k: _is_model_available(k) for k in MODEL_FILES}
    return jsonify({
        'status': 'ok',
        'service': 'flowstate-ml-pipeline',
        'models_ready': models_loaded,
    })


@app.route('/status', methods=['GET'])
def model_status():
    """Get status of all pipeline models."""
    models_info = {}

    for key, filename in MODEL_FILES.items():
        model_path = os.path.join(MODELS_DIR, filename)
        models_info[key] = {
            'has_onnx_file': os.path.exists(model_path),
            'onnx_loaded': key in _onnx_sessions,
            'lgbm_cached': key in _lgbm_models,
            'ready': _is_model_available(key),
            'file': filename,
        }

    metadata_path = os.path.join(MODELS_DIR, 'pipeline_metadata.json')
    metadata = None
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

    return jsonify({
        'models': models_info,
        'thresholds': _model_thresholds,
        'metadata': metadata,
    })


@app.route('/train', methods=['POST'])
def train():
    """
    Train all 3 models in the pipeline.
    
    Request body:
    {
        "training_data": [...],  // Optional: pre-formatted training data
        "use_dummy": true        // Optional: use dummy data for demo
    }
    """
    global _lgbm_models, _model_thresholds

    try:
        data = request.get_json() or {}
        use_dummy = data.get('use_dummy', False)
        training_data = data.get('training_data', None)

        if use_dummy or training_data is None:
            print("[ML Service] Using dummy data for pipeline training...")
            training_data = generate_dummy_data(num_days=7)

        # Train all 3 models
        results = train_all_models(training_data)

        if results is None:
            return jsonify({'error': 'Pipeline training failed'}), 500

        # Cache LightGBM models in-memory
        for key in ['energy', 'break_suggestion', 'task_switch']:
            if results.get(key) and results[key].get('model'):
                _lgbm_models[key] = results[key]

        # Update thresholds
        if results.get('break_suggestion'):
            _model_thresholds['break_suggestion'] = results['break_suggestion']['threshold']
        if results.get('task_switch'):
            _model_thresholds['task_switch'] = results['task_switch']['threshold']

        # Export all to ONNX
        exported = export_all_models(results, models_dir=MODELS_DIR)

        # Save pipeline metadata
        _save_pipeline_metadata(results)

        # Reload ONNX models from disk
        _load_onnx_models()

        return jsonify({
            'success': True,
            'models_exported': list(exported.keys()),
            'energy': {
                'mae': results['energy']['mae'] if results.get('energy') else None,
                'r2': results['energy']['r2'] if results.get('energy') else None,
            },
            'break_suggestion': {
                'auc': results['break_suggestion']['auc'] if results.get('break_suggestion') else None,
                'f1': results['break_suggestion']['f1'] if results.get('break_suggestion') else None,
            },
            'task_switch': {
                'auc': results['task_switch']['auc'] if results.get('task_switch') else None,
                'f1': results['task_switch']['f1'] if results.get('task_switch') else None,
            },
        })

    except Exception as e:
        print(f"[ML Service] Pipeline training error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/model/download/<model_name>', methods=['GET'])
def download_model(model_name):
    """Download a specific ONNX model file.
    
    Valid model_name values: energy, break, task-switch
    """
    filename_map = {
        'energy': 'energy-model.onnx',
        'break': 'break-model.onnx',
        'task-switch': 'task-switch-model.onnx',
    }

    filename = filename_map.get(model_name)
    if not filename:
        return jsonify({'error': f'Unknown model: {model_name}. Valid: {list(filename_map.keys())}'}), 400

    model_path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(model_path):
        return jsonify({'error': f'No trained {model_name} model found'}), 404

    return send_file(model_path, as_attachment=True, download_name=filename)


# ==============================================================================
# PREDICTION ENDPOINTS
# ==============================================================================

@app.route('/predict', methods=['POST'])
def predict_pipeline():
    """
    Run the full prediction pipeline.
    
    Request body: features dict (raw activity metrics + session context)
    
    Returns:
    {
        "energy_score": 72,
        "should_suggest_break": false,
        "break_confidence": 0.23,
        "should_suggest_switch": false,
        "switch_confidence": 0.15,
        "reasoning": { ... }
    }
    """
    try:
        features = request.get_json()
        if not features:
            return jsonify({'error': 'No features provided'}), 400

        result = _run_pipeline_prediction(features)
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/predict/energy', methods=['POST'])
def predict_energy():
    """Predict energy score only."""
    try:
        features = request.get_json()
        if not features:
            return jsonify({'error': 'No features provided'}), 400

        if not _is_model_available('energy'):
            return jsonify({'error': 'Energy model not loaded. Call /train first.'}), 404

        score = _predict_single('energy', features)
        return jsonify({'energy_score': round(score, 1)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/break', methods=['POST'])
def predict_break():
    """Predict if a break should be suggested."""
    try:
        features = request.get_json()
        if not features:
            return jsonify({'error': 'No features provided'}), 400

        if not _is_model_available('break_suggestion'):
            return jsonify({'error': 'Break model not loaded. Call /train first.'}), 404

        proba = _predict_single('break_suggestion', features)
        threshold = _model_thresholds.get('break_suggestion', 0.5)

        return jsonify({
            'should_suggest_break': proba >= threshold,
            'confidence': round(proba, 3),
            'threshold': threshold,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/switch', methods=['POST'])
def predict_switch():
    """Predict if a task switch should be suggested."""
    try:
        features = request.get_json()
        if not features:
            return jsonify({'error': 'No features provided'}), 400

        if not _is_model_available('task_switch'):
            return jsonify({'error': 'Task switch model not loaded. Call /train first.'}), 404

        proba = _predict_single('task_switch', features)
        threshold = _model_thresholds.get('task_switch', 0.5)

        return jsonify({
            'should_suggest_switch': proba >= threshold,
            'confidence': round(proba, 3),
            'threshold': threshold,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==============================================================================
# PREDICTION LOGIC
# ==============================================================================

def _predict_single(model_key, features):
    """
    Run a single model prediction, preferring ONNX over LightGBM.
    
    Returns:
        float: predicted value (energy score) or probability (break/switch)
    """
    feature_names = MODEL_FEATURES[model_key]

    # Prefer ONNX (fast, production-ready)
    if model_key in _onnx_sessions:
        output_type, value = _onnx_predict(
            _onnx_sessions[model_key], features, feature_names
        )
        if output_type == 'regressor':
            return float(np.clip(value, 0, 100))
        else:
            return value  # probability

    # Fallback to in-memory LightGBM
    if model_key in _lgbm_models:
        import pandas as pd
        model = _lgbm_models[model_key]['model']
        X = pd.DataFrame([features])[feature_names].fillna(0)

        if model_key == 'energy':
            return float(np.clip(model.predict(X)[0], 0, 100))
        else:
            return float(model.predict_proba(X)[0, 1])

    raise RuntimeError(f"No model available for '{model_key}'")


def _run_pipeline_prediction(features):
    """
    Run the full pipeline: Energy → Break → Task Switch.
    Each model feeds its output into the next.
    """
    result = {
        'energy_score': None,
        'should_suggest_break': False,
        'break_confidence': 0.0,
        'should_suggest_switch': False,
        'switch_confidence': 0.0,
        'reasoning': {},
    }

    # ── Step 1: Energy prediction ──
    if _is_model_available('energy'):
        try:
            energy_score = _predict_single('energy', features)
            result['energy_score'] = round(energy_score, 1)
            # Feed energy score into downstream models
            features['predicted_energy'] = round(energy_score, 1)
            result['reasoning']['energy_level'] = (
                'peak' if energy_score >= 80 else
                'good' if energy_score >= 60 else
                'low' if energy_score >= 40 else
                'critical'
            )
        except Exception as e:
            result['reasoning']['energy'] = f'Prediction error: {str(e)}'
    else:
        result['reasoning']['energy'] = 'Model not loaded'

    # ── Step 2: Break suggestion ──
    if _is_model_available('break_suggestion'):
        try:
            break_proba = _predict_single('break_suggestion', features)
            threshold = _model_thresholds.get('break_suggestion', 0.5)
            result['should_suggest_break'] = break_proba >= threshold
            result['break_confidence'] = round(break_proba, 3)
            # Feed break probability into task switch model
            features['break_suggestion_prob'] = round(break_proba, 3)

            if result['should_suggest_break']:
                result['reasoning']['break'] = 'Model recommends a break based on current metrics'
            else:
                result['reasoning']['break'] = 'No break needed right now'
        except Exception as e:
            result['reasoning']['break'] = f'Prediction error: {str(e)}'
    else:
        result['reasoning']['break'] = 'Model not loaded'

    # ── Step 3: Task switch ──
    if _is_model_available('task_switch'):
        try:
            switch_proba = _predict_single('task_switch', features)
            threshold = _model_thresholds.get('task_switch', 0.5)
            result['should_suggest_switch'] = switch_proba >= threshold
            result['switch_confidence'] = round(switch_proba, 3)

            if result['should_suggest_switch']:
                result['reasoning']['task_switch'] = 'Consider switching to a simpler task'
            else:
                result['reasoning']['task_switch'] = 'Continue current task'
        except Exception as e:
            result['reasoning']['task_switch'] = f'Prediction error: {str(e)}'
    else:
        result['reasoning']['task_switch'] = 'Model not loaded'

    return result


# ==============================================================================
# SERVER STARTUP
# ==============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("  FlowState ML Pipeline Service")
    print("=" * 60)

    # Step 1: Try loading existing ONNX models from disk
    loaded = _load_onnx_models()

    # Step 2: If no models found, auto-train with dummy data
    if loaded == 0:
        _auto_train_if_needed()

    ready_models = [k for k in MODEL_FILES if _is_model_available(k)]
    print(f"\n[Ready] Models available: {ready_models}")
    print(f"[Ready] Starting server on http://0.0.0.0:5050")
    print("=" * 60)

    app.run(host='0.0.0.0', port=5050, debug=True)
