"""
FlowState ML Training Service - Flask API
==========================================
Endpoints:
  POST /train    - Train model from Week 1 data
  POST /predict  - Make a prediction (for testing)
  GET  /status   - Get model status
  GET  /health   - Health check
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from train_model import train_energy_model, generate_dummy_data
from export_onnx import export_to_onnx
import os
import json

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'flowstate-ml'})


@app.route('/status', methods=['GET'])
def model_status():
    model_path = os.path.join(MODELS_DIR, 'energy_model.onnx')
    metadata_path = os.path.join(MODELS_DIR, 'model_metadata.json')

    has_model = os.path.exists(model_path)
    metadata = None

    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

    return jsonify({
        'has_model': has_model,
        'metadata': metadata,
    })


@app.route('/train', methods=['POST'])
def train():
    """
    Train the energy prediction model.
    
    Request body:
    {
        "training_data": [...],  // Optional: pre-formatted training data
        "use_dummy": true        // Optional: use dummy data for demo
    }
    """
    try:
        data = request.get_json() or {}
        use_dummy = data.get('use_dummy', False)
        training_data = data.get('training_data', None)

        if use_dummy or training_data is None:
            print("[ML Service] Using dummy data for training...")
            training_data = generate_dummy_data(num_days=7)

        # Train the model
        result = train_energy_model(training_data)

        if result is None:
            return jsonify({'error': 'Training failed'}), 500

        # Export to ONNX
        onnx_path = export_to_onnx(
            result['model'],
            result['feature_names'],
            os.path.join(MODELS_DIR, 'energy_model.onnx')
        )

        # Save metadata
        metadata = {
            'mae': result['mae'],
            'r2': result['r2'],
            'feature_count': len(result['feature_names']),
            'feature_names': result['feature_names'],
            'training_samples': result['num_samples'],
            'model_path': onnx_path,
        }

        with open(os.path.join(MODELS_DIR, 'model_metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)

        return jsonify({
            'success': True,
            'mae': result['mae'],
            'r2': result['r2'],
            'num_samples': result['num_samples'],
            'model_path': onnx_path,
        })

    except Exception as e:
        print(f"[ML Service] Training error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/model/download', methods=['GET'])
def download_model():
    """Download the trained ONNX model file"""
    model_path = os.path.join(MODELS_DIR, 'energy_model.onnx')
    if not os.path.exists(model_path):
        return jsonify({'error': 'No trained model found'}), 404

    return send_file(model_path, as_attachment=True, download_name='energy-model.onnx')


@app.route('/predict', methods=['POST'])
def predict():
    """
    Test prediction endpoint (for debugging).
    In production, inference runs locally via ONNX in Electron.
    """
    try:
        from models.energy_predictor import EnergyPredictorModel
        
        features = request.get_json()
        predictor = EnergyPredictorModel()
        
        model_path = os.path.join(MODELS_DIR, 'energy_model.onnx')
        if not os.path.exists(model_path):
            return jsonify({'error': 'No model trained yet'}), 404
        
        score = predictor.predict_from_onnx(model_path, features)
        return jsonify({'energy_score': score})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("FlowState ML Service starting on port 5050...")
    app.run(host='0.0.0.0', port=5050, debug=True)
