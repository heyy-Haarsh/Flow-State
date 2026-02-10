// FlowState - ONNX Model Loader
// Handles loading, validation, and status of ML models

const path = require('path');
const fs = require('fs');

class ModelLoader {
    constructor() {
        this.modelsDir = path.join(__dirname, 'models');
        this.currentModel = null;
        this.modelInfo = null;
    }

    /**
     * Check if a trained model exists
     */
    hasModel() {
        const modelPath = path.join(this.modelsDir, 'energy-model.onnx');
        return fs.existsSync(modelPath);
    }

    /**
     * Get the path to the current model
     */
    getModelPath() {
        const modelPath = path.join(this.modelsDir, 'energy-model.onnx');
        if (!fs.existsSync(modelPath)) return null;
        return modelPath;
    }

    /**
     * Save a new model (received from Python training service)
     * @param {Buffer} modelBuffer - ONNX model binary data
     * @param {object} metadata - Training metadata (MAE, feature count, etc.)
     */
    saveModel(modelBuffer, metadata = {}) {
        // Ensure models directory exists
        if (!fs.existsSync(this.modelsDir)) {
            fs.mkdirSync(this.modelsDir, { recursive: true });
        }

        const modelPath = path.join(this.modelsDir, 'energy-model.onnx');
        const metadataPath = path.join(this.modelsDir, 'model-metadata.json');

        // Backup previous model if exists
        if (fs.existsSync(modelPath)) {
            const backupPath = path.join(
                this.modelsDir,
                `energy-model-backup-${Date.now()}.onnx`
            );
            fs.copyFileSync(modelPath, backupPath);
        }

        // Write new model
        fs.writeFileSync(modelPath, modelBuffer);

        // Write metadata
        const fullMetadata = {
            ...metadata,
            savedAt: new Date().toISOString(),
            fileSizeBytes: modelBuffer.length,
        };
        fs.writeFileSync(metadataPath, JSON.stringify(fullMetadata, null, 2));

        this.modelInfo = fullMetadata;
        console.log('[ModelLoader] Model saved successfully');

        return fullMetadata;
    }

    /**
     * Get model metadata
     */
    getModelInfo() {
        if (this.modelInfo) return this.modelInfo;

        const metadataPath = path.join(this.modelsDir, 'model-metadata.json');
        if (!fs.existsSync(metadataPath)) return null;

        try {
            this.modelInfo = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            return this.modelInfo;
        } catch {
            return null;
        }
    }

    /**
     * Delete the current model
     */
    deleteModel() {
        const modelPath = path.join(this.modelsDir, 'energy-model.onnx');
        const metadataPath = path.join(this.modelsDir, 'model-metadata.json');

        if (fs.existsSync(modelPath)) fs.unlinkSync(modelPath);
        if (fs.existsSync(metadataPath)) fs.unlinkSync(metadataPath);

        this.modelInfo = null;
        this.currentModel = null;

        console.log('[ModelLoader] Model deleted');
    }
}

module.exports = new ModelLoader();
