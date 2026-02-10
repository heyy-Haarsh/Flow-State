// FlowState - ML Inference Service
// Runs ONNX model predictions locally in Electron

const path = require('path');

class EnergyPredictor {
    constructor() {
        this.session = null;
        this.isLoaded = false;
        this.featureOrder = [
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
        ];
    }

    async loadModel() {
        try {
            // Dynamic import to avoid crash if onnxruntime-node not installed
            const ort = require('onnxruntime-node');
            const modelPath = path.join(__dirname, '../ml/models/energy-model.onnx');

            this.session = await ort.InferenceSession.create(modelPath);
            this.isLoaded = true;
            console.log('[EnergyPredictor] ONNX model loaded successfully');
        } catch (error) {
            console.warn('[EnergyPredictor] Could not load ONNX model:', error.message);
            console.warn('[EnergyPredictor] Will use rule-based fallback');
            this.isLoaded = false;
        }
    }

    async predict(features) {
        if (!this.isLoaded || !this.session) {
            return null; // Fallback to rule-based
        }

        try {
            const ort = require('onnxruntime-node');

            // Convert features object to ordered array
            const inputArray = new Float32Array(
                this.featureOrder.map((key) => {
                    const value = features[key];
                    if (typeof value === 'boolean') return value ? 1.0 : 0.0;
                    return Number(value) || 0;
                })
            );

            // Create tensor
            const tensor = new ort.Tensor('float32', inputArray, [1, this.featureOrder.length]);

            // Run inference
            const results = await this.session.run({ float_input: tensor });
            const energyScore = results.variable.data[0];

            return Math.round(Math.max(0, Math.min(100, energyScore)));
        } catch (error) {
            console.error('[EnergyPredictor] Prediction error:', error.message);
            return null;
        }
    }

    getStatus() {
        return {
            isLoaded: this.isLoaded,
            featureCount: this.featureOrder.length,
        };
    }
}

module.exports = new EnergyPredictor();
