// FlowState - ONNX Model Loader (Multi-Model Pipeline)
// Handles loading, validation, and status of all 3 ML models:
//   1. energy-model.onnx       (Regressor)
//   2. break-model.onnx        (Classifier)
//   3. task-switch-model.onnx   (Classifier)

const path = require('path');
const fs = require('fs');

const MODEL_CONFIGS = {
    energy: { filename: 'energy-model.onnx', type: 'regressor' },
    break: { filename: 'break-model.onnx', type: 'classifier' },
    taskSwitch: { filename: 'task-switch-model.onnx', type: 'classifier' },
};

class ModelLoader {
    constructor() {
        this.modelsDir = path.join(__dirname, 'models');
        this.modelInfoCache = null;
    }

    // ---- Status Checks ----

    /**
     * Check if a specific model exists.
     * @param {'energy'|'break'|'taskSwitch'} modelKey
     */
    hasModel(modelKey = 'energy') {
        const cfg = MODEL_CONFIGS[modelKey];
        if (!cfg) return false;
        return fs.existsSync(path.join(this.modelsDir, cfg.filename));
    }

    /**
     * Check which models are available.
     * @returns {{ energy: boolean, break: boolean, taskSwitch: boolean }}
     */
    getAvailableModels() {
        return {
            energy: this.hasModel('energy'),
            break: this.hasModel('break'),
            taskSwitch: this.hasModel('taskSwitch'),
        };
    }

    /**
     * True if all 3 pipeline models are available.
     */
    hasFullPipeline() {
        const avail = this.getAvailableModels();
        return avail.energy && avail.break && avail.taskSwitch;
    }

    // ---- Paths ----

    /**
     * Get path to a specific model.
     * @param {'energy'|'break'|'taskSwitch'} modelKey
     */
    getModelPath(modelKey = 'energy') {
        const cfg = MODEL_CONFIGS[modelKey];
        if (!cfg) return null;
        const modelPath = path.join(this.modelsDir, cfg.filename);
        return fs.existsSync(modelPath) ? modelPath : null;
    }

    /**
     * Get paths for all available models.
     */
    getAllModelPaths() {
        const paths = {};
        for (const [key, cfg] of Object.entries(MODEL_CONFIGS)) {
            const modelPath = path.join(this.modelsDir, cfg.filename);
            if (fs.existsSync(modelPath)) {
                paths[key] = modelPath;
            }
        }
        return paths;
    }

    // ---- Save ----

    /**
     * Save a model file (received from Python training service).
     * @param {'energy'|'break'|'taskSwitch'} modelKey
     * @param {Buffer} modelBuffer - ONNX binary data
     * @param {object} metadata - Training metrics
     */
    saveModel(modelKey, modelBuffer, metadata = {}) {
        const cfg = MODEL_CONFIGS[modelKey];
        if (!cfg) throw new Error(`Unknown model key: ${modelKey}`);

        if (!fs.existsSync(this.modelsDir)) {
            fs.mkdirSync(this.modelsDir, { recursive: true });
        }

        const modelPath = path.join(this.modelsDir, cfg.filename);

        // Backup previous
        if (fs.existsSync(modelPath)) {
            const backupName = cfg.filename.replace('.onnx', `-backup-${Date.now()}.onnx`);
            fs.copyFileSync(modelPath, path.join(this.modelsDir, backupName));
        }

        fs.writeFileSync(modelPath, modelBuffer);

        // Individual metadata
        const metaPath = path.join(this.modelsDir, `${modelKey}-metadata.json`);
        const fullMeta = {
            ...metadata,
            modelKey,
            modelType: cfg.type,
            savedAt: new Date().toISOString(),
            fileSizeBytes: modelBuffer.length,
        };
        fs.writeFileSync(metaPath, JSON.stringify(fullMeta, null, 2));

        console.log(`[ModelLoader] ${modelKey} model saved (${(modelBuffer.length / 1024).toFixed(1)} KB)`);
        this.modelInfoCache = null; // bust cache

        return fullMeta;
    }

    /**
     * Save pipeline metadata (after training all models).
     */
    savePipelineMetadata(metadata) {
        if (!fs.existsSync(this.modelsDir)) {
            fs.mkdirSync(this.modelsDir, { recursive: true });
        }
        const metaPath = path.join(this.modelsDir, 'pipeline-metadata.json');
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

        // Backward compatibility: also save as model-metadata.json for energy model
        if (metadata.models && metadata.models.energy) {
            const compatPath = path.join(this.modelsDir, 'model-metadata.json');
            fs.writeFileSync(compatPath, JSON.stringify({
                ...metadata.models.energy,
                savedAt: new Date().toISOString(),
            }, null, 2));
        }

        this.modelInfoCache = null;
        console.log('[ModelLoader] Pipeline metadata saved');
    }

    // ---- Metadata ----

    /**
     * Get metadata for all models (cached).
     */
    getModelInfo() {
        if (this.modelInfoCache) return this.modelInfoCache;

        const info = { models: {}, pipeline: null };

        // Load individual model metadata
        for (const key of Object.keys(MODEL_CONFIGS)) {
            const metaPath = path.join(this.modelsDir, `${key}-metadata.json`);
            if (fs.existsSync(metaPath)) {
                try {
                    info.models[key] = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                } catch { /* skip */ }
            }
        }

        // Pipeline metadata
        const pipelinePath = path.join(this.modelsDir, 'pipeline-metadata.json');
        if (fs.existsSync(pipelinePath)) {
            try {
                info.pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf-8'));
            } catch { /* skip */ }
        }

        this.modelInfoCache = info;
        return info;
    }

    // ---- Cleanup ----

    /**
     * Delete a specific model.
     */
    deleteModel(modelKey = 'energy') {
        const cfg = MODEL_CONFIGS[modelKey];
        if (!cfg) return;

        const modelPath = path.join(this.modelsDir, cfg.filename);
        const metaPath = path.join(this.modelsDir, `${modelKey}-metadata.json`);

        if (fs.existsSync(modelPath)) fs.unlinkSync(modelPath);
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

        this.modelInfoCache = null;
        console.log(`[ModelLoader] ${modelKey} model deleted`);
    }

    /**
     * Delete all pipeline models.
     */
    deleteAllModels() {
        for (const key of Object.keys(MODEL_CONFIGS)) {
            this.deleteModel(key);
        }
        const pipelinePath = path.join(this.modelsDir, 'pipeline-metadata.json');
        if (fs.existsSync(pipelinePath)) fs.unlinkSync(pipelinePath);
        console.log('[ModelLoader] All models deleted');
    }
}

module.exports = new ModelLoader();
