"""
FlowState - ONNX Export (Multi-Model Pipeline)
================================================
Converts all trained LightGBM models to ONNX format:
  1. energy_model.onnx       (Regressor)
  2. break_model.onnx        (Classifier)
  3. task_switch_model.onnx   (Classifier)
"""

import numpy as np
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType
import onnxruntime as ort
import os


def export_to_onnx(model, feature_names, output_path):
    """
    Convert a LightGBM model (Regressor or Classifier) to ONNX format.

    Args:
        model: trained LightGBM model (LGBMRegressor or LGBMClassifier)
        feature_names: list of feature names
        output_path: path to save the ONNX file

    Returns:
        output_path on success
    """
    num_features = len(feature_names)
    model_name = os.path.basename(output_path).replace('.onnx', '')
    print(f"[ONNX Export] Converting '{model_name}' ({num_features} features)...")

    initial_types = [
        ('float_input', FloatTensorType([None, num_features]))
    ]

    onnx_model = onnxmltools.convert_lightgbm(
        model,
        initial_types=initial_types,
        target_opset=12
    )

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())

    file_size = os.path.getsize(output_path)
    print(f"[ONNX Export] Saved: {output_path} ({file_size / 1024:.1f} KB)")

    validate_onnx_model(output_path, num_features)
    return output_path


def validate_onnx_model(model_path, num_features):
    """
    Validate the exported ONNX model by running a test prediction.
    """
    try:
        session = ort.InferenceSession(model_path)
        test_input = np.random.rand(1, num_features).astype(np.float32)
        input_name = session.get_inputs()[0].name
        result = session.run(None, {input_name: test_input})

        # Handle both regressor (single value) and classifier (probabilities)
        output = result[0]
        if len(output.shape) > 1 and output.shape[1] > 1:
            # Classifier: show probability
            prediction = float(output[0][1])
            print(f"[ONNX Validate] Test prob(class=1): {prediction:.4f} [OK]")
        else:
            prediction = float(output.flatten()[0])
            print(f"[ONNX Validate] Test prediction: {prediction:.2f} [OK]")

    except Exception as e:
        print(f"[ONNX Validate] Validation failed: {e} [FAIL]")


def export_all_models(results, models_dir='models'):
    """
    Export all pipeline models to ONNX.

    Args:
        results: dict from train_all_models() with keys:
                 'energy', 'break_suggestion', 'task_switch'
        models_dir: directory to save models

    Returns:
        dict of {model_name: onnx_path}
    """
    os.makedirs(models_dir, exist_ok=True)
    exported = {}

    model_configs = [
        ('energy', 'energy-model.onnx'),
        ('break_suggestion', 'break-model.onnx'),
        ('task_switch', 'task-switch-model.onnx'),
    ]

    for key, filename in model_configs:
        result = results.get(key)
        if result is None or result.get('model') is None:
            print(f"[ONNX Export] Skipping '{key}' (no trained model)")
            continue

        output_path = os.path.join(models_dir, filename)
        path = export_to_onnx(
            result['model'],
            result['feature_names'],
            output_path
        )
        exported[key] = path

    print(f"\n[ONNX Export] Exported {len(exported)}/{len(model_configs)} models")
    return exported


if __name__ == '__main__':
    from train_model import train_all_models, generate_dummy_data

    print("=" * 60)
    print("FlowState ONNX Export - Full Pipeline")
    print("=" * 60)

    # Generate data and train all models
    data = generate_dummy_data(num_days=7)
    results = train_all_models(data)

    if results:
        exported = export_all_models(results, models_dir='models')
        print(f"\n[OK] Exported models:")
        for key, path in exported.items():
            print(f"  {key}: {path}")
        print(f"\nCopy commands:")
        for key, path in exported.items():
            dest_name = os.path.basename(path)
            print(f"  copy {path} ..\\main\\ml\\models\\{dest_name}")
    else:
        print("\n[FAIL] Training failed, cannot export")
