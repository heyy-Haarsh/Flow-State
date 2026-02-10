"""
FlowState - ONNX Export
========================
Converts trained LightGBM model to ONNX format
for local inference in Electron via onnxruntime-node.
"""

import numpy as np
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnxmltools
from onnxmltools.convert import convert_lightgbm
from onnxmltools.convert.common.data_types import FloatTensorType as LGBFloatTensorType
import onnxruntime as ort
import os


def export_to_onnx(model, feature_names, output_path):
    """
    Convert a LightGBM model to ONNX format.
    
    Args:
        model: Trained LightGBM model
        feature_names: List of feature names (in order)
        output_path: Where to save the .onnx file
    
    Returns:
        Path to the saved ONNX model
    """
    num_features = len(feature_names)

    print(f"[ONNX Export] Converting model ({num_features} features)...")

    # Define input type
    initial_types = [
        ('float_input', LGBFloatTensorType([None, num_features]))
    ]

    # Convert to ONNX
    onnx_model = convert_lightgbm(
        model,
        initial_types=initial_types,
        target_opset=12,
    )

    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())

    file_size = os.path.getsize(output_path)
    print(f"[ONNX Export] Model saved to: {output_path}")
    print(f"[ONNX Export] File size: {file_size / 1024:.1f} KB")

    # Validate by running a test prediction
    validate_onnx_model(output_path, num_features)

    return output_path


def validate_onnx_model(model_path, num_features):
    """
    Validate the exported ONNX model by running a test prediction.
    """
    try:
        session = ort.InferenceSession(model_path)

        # Create dummy input
        test_input = np.random.rand(1, num_features).astype(np.float32)

        # Get input name
        input_name = session.get_inputs()[0].name

        # Run prediction
        result = session.run(None, {input_name: test_input})
        prediction = result[0][0]

        print(f"[ONNX Validate] Test prediction: {prediction:.2f} ✅")

    except Exception as e:
        print(f"[ONNX Validate] Validation failed: {e} ❌")
        raise


if __name__ == '__main__':
    from train_model import train_energy_model, generate_dummy_data

    print("=" * 50)
    print("FlowState ONNX Export - Standalone Test")
    print("=" * 50)

    # Train model
    data = generate_dummy_data(num_days=7)
    result = train_energy_model(data)

    if result:
        # Export
        output_path = os.path.join('models', 'energy_model.onnx')
        export_to_onnx(result['model'], result['feature_names'], output_path)
        print(f"\n✅ ONNX model exported to: {output_path}")
    else:
        print("\n❌ Training failed, cannot export")
