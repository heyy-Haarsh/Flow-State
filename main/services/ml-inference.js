// FlowState - ML Inference Pipeline Service
// Runs the full 3-model ONNX pipeline locally in Electron:
//   1. Energy Predictor (Regressor)   → energy_score 0-100
//   2. Break Suggester (Classifier)   → should_suggest_break + confidence
//   3. Task Switch Recommender (Classifier) → should_suggest_switch + confidence
//
// Pipeline flow:
//   Raw features → [Energy Model] → energy_score
//                → [Break Model]  → break probability (uses energy_score)
//                → [Task Switch]  → switch probability (uses energy + break)

const path = require('path');
const modelLoader = require('../ml/model-loader');

// Feature order must match training (train_model.py)
const ENERGY_FEATURE_ORDER = [
    'typing_speed_5min', 'typing_speed_15min',
    'error_rate_5min', 'error_rate_15min',
    'mouse_entropy', 'idle_percentage',
    'session_duration', 'time_since_break',
    'tasks_completed_hour', 'hour_of_day', 'day_of_week',
    'sleep_quality', 'stress_level', 'caffeine_intake',
    'exercise_today', 'expected_difficulty',
    'typing_speed_ratio', 'error_rate_ratio',
];

const BREAK_FEATURE_ORDER = [
    'typing_speed_5min', 'typing_speed_15min', 'typing_speed_ratio',
    'error_rate_5min', 'error_rate_15min', 'error_rate_ratio',
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
];

const TASK_SWITCH_FEATURE_ORDER = [
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
];

class MLPipeline {
    constructor() {
        // ONNX sessions
        this.energySession = null;
        this.breakSession = null;
        this.switchSession = null;

        // Status tracking
        this.loaded = { energy: false, break: false, taskSwitch: false };

        // Model thresholds (from training metadata, fallback to reasonable defaults)
        this.breakThreshold = 0.5;
        this.switchThreshold = 0.5;
    }

    // ========================================================================
    // MODEL LOADING
    // ========================================================================

    /**
     * Load all available pipeline models.
     * Gracefully handles missing models — the pipeline degrades but doesn't crash.
     */
    async loadModels() {
        let ort;
        try {
            ort = require('onnxruntime-node');
        } catch (err) {
            console.warn('[MLPipeline] onnxruntime-node not available:', err.message);
            console.warn('[MLPipeline] All predictions will use rule-based fallback');
            return;
        }

        // Load thresholds from metadata if available
        this._loadThresholds();

        // 1. Energy model (required for pipeline)
        const energyPath = modelLoader.getModelPath('energy');
        if (energyPath) {
            try {
                this.energySession = await ort.InferenceSession.create(energyPath);
                this.loaded.energy = true;
                console.log('[MLPipeline] ✓ Energy model loaded');
            } catch (err) {
                console.warn('[MLPipeline] ✗ Energy model failed:', err.message);
            }
        }

        // 2. Break model (optional, enhances pipeline)
        const breakPath = modelLoader.getModelPath('break');
        if (breakPath) {
            try {
                this.breakSession = await ort.InferenceSession.create(breakPath);
                this.loaded.break = true;
                console.log('[MLPipeline] ✓ Break model loaded');
            } catch (err) {
                console.warn('[MLPipeline] ✗ Break model failed:', err.message);
            }
        }

        // 3. Task switch model (optional, enhances pipeline)
        const switchPath = modelLoader.getModelPath('taskSwitch');
        if (switchPath) {
            try {
                this.switchSession = await ort.InferenceSession.create(switchPath);
                this.loaded.taskSwitch = true;
                console.log('[MLPipeline] ✓ Task switch model loaded');
            } catch (err) {
                console.warn('[MLPipeline] ✗ Task switch model failed:', err.message);
            }
        }

        const loadedCount = Object.values(this.loaded).filter(Boolean).length;
        console.log(`[MLPipeline] ${loadedCount}/3 models loaded`);
    }

    /**
     * Alias for backward compatibility with existing code.
     */
    async loadModel() {
        return this.loadModels();
    }

    /**
     * Load optimal thresholds from pipeline metadata.
     */
    _loadThresholds() {
        try {
            const info = modelLoader.getModelInfo();
            if (info.pipeline && info.pipeline.models) {
                if (info.pipeline.models.break_suggestion) {
                    this.breakThreshold = info.pipeline.models.break_suggestion.threshold || 0.5;
                }
                if (info.pipeline.models.task_switch) {
                    this.switchThreshold = info.pipeline.models.task_switch.threshold || 0.5;
                }
                console.log(`[MLPipeline] Thresholds: break=${this.breakThreshold}, switch=${this.switchThreshold}`);
            }
        } catch {
            // Use defaults
        }
    }

    // ========================================================================
    // INDIVIDUAL MODEL PREDICTIONS
    // ========================================================================

    /**
     * Run ONNX regressor prediction.
     * @returns {number|null}
     */
    async _predictRegressor(session, features, featureOrder) {
        if (!session) return null;
        try {
            const ort = require('onnxruntime-node');
            const inputArray = new Float32Array(
                featureOrder.map(key => {
                    const v = features[key];
                    if (typeof v === 'boolean') return v ? 1.0 : 0.0;
                    return Number(v) || 0;
                })
            );
            const tensor = new ort.Tensor('float32', inputArray, [1, featureOrder.length]);
            const results = await session.run({ float_input: tensor });
            const output = Object.values(results)[0];
            return parseFloat(output.data[0]);
        } catch (err) {
            console.error('[MLPipeline] Regressor error:', err.message);
            return null;
        }
    }

    /**
     * Run ONNX classifier prediction.
     * @returns {number|null} Probability of positive class (0.0 - 1.0)
     */
    async _predictClassifier(session, features, featureOrder) {
        if (!session) return null;
        try {
            const ort = require('onnxruntime-node');
            const inputArray = new Float32Array(
                featureOrder.map(key => {
                    const v = features[key];
                    if (typeof v === 'boolean') return v ? 1.0 : 0.0;
                    return Number(v) || 0;
                })
            );
            const tensor = new ort.Tensor('float32', inputArray, [1, featureOrder.length]);
            const results = await session.run({ float_input: tensor });

            // LightGBM classifiers output probabilities in different ways:
            // Try label output first, then check shape
            const output = Object.values(results)[0];
            const data = Array.from(output.data);

            if (data.length >= 2) {
                // [prob_class0, prob_class1]
                return data[1];
            }
            return data[0];
        } catch (err) {
            console.error('[MLPipeline] Classifier error:', err.message);
            return null;
        }
    }

    // ========================================================================
    // FULL PIPELINE PREDICTION
    // ========================================================================

    /**
     * Run the full prediction pipeline.
     * 
     * Pipeline flow:
     *   features → Energy Model → predicted_energy
     *            → Break Model  → should_suggest_break + break_confidence
     *            → Task Switch  → should_suggest_switch + switch_confidence
     *
     * @param {object} features - Unified feature map (from feature-extractor.js)
     * @returns {object} Pipeline result
     */
    async predictPipeline(features) {
        const result = {
            energyScore: null,
            energyLevel: 'unknown',
            shouldSuggestBreak: false,
            breakConfidence: 0.0,
            shouldSuggestSwitch: false,
            switchConfidence: 0.0,
            reasoning: {},
            modelsUsed: { energy: false, break: false, taskSwitch: false },
        };

        // Make a mutable copy of features (pipeline enriches it as it goes)
        const enriched = { ...features };

        // ---- Step 1: Energy Prediction ----
        if (this.loaded.energy) {
            const rawScore = await this._predictRegressor(
                this.energySession, enriched, ENERGY_FEATURE_ORDER
            );
            if (rawScore !== null) {
                const score = Math.round(Math.max(0, Math.min(100, rawScore)));
                result.energyScore = score;
                result.energyLevel = this._getEnergyLevel(score);
                enriched.predicted_energy = score;  // Feed to break model
                result.modelsUsed.energy = true;
                result.reasoning.energy = `Energy at ${score} (${result.energyLevel})`;
            }
        }

        // Fallback: if energy model failed, use 50 as neutral
        if (enriched.predicted_energy === undefined || enriched.predicted_energy === 50) {
            enriched.predicted_energy = enriched.predicted_energy || 50;
        }

        // ---- Step 2: Break Suggestion ----
        if (this.loaded.break) {
            const breakProba = await this._predictClassifier(
                this.breakSession, enriched, BREAK_FEATURE_ORDER
            );
            if (breakProba !== null) {
                result.breakConfidence = Math.round(breakProba * 1000) / 1000;
                result.shouldSuggestBreak = breakProba >= this.breakThreshold;
                enriched.break_suggestion_prob = breakProba;  // Feed to task switch model
                result.modelsUsed.break = true;

                if (result.shouldSuggestBreak) {
                    result.reasoning.break = `Break recommended (confidence: ${(breakProba * 100).toFixed(0)}%)`;
                } else {
                    result.reasoning.break = `No break needed (confidence: ${((1 - breakProba) * 100).toFixed(0)}%)`;
                }
            }
        } else {
            // Rule-based fallback for break suggestion
            const breakFallback = this._ruleBasedBreakSuggestion(enriched);
            result.shouldSuggestBreak = breakFallback.shouldSuggest;
            result.breakConfidence = breakFallback.confidence;
            enriched.break_suggestion_prob = breakFallback.confidence;
            result.reasoning.break = breakFallback.reason;
        }

        // ---- Step 3: Task Switch Recommendation ----
        if (this.loaded.taskSwitch) {
            const switchProba = await this._predictClassifier(
                this.switchSession, enriched, TASK_SWITCH_FEATURE_ORDER
            );
            if (switchProba !== null) {
                result.switchConfidence = Math.round(switchProba * 1000) / 1000;
                result.shouldSuggestSwitch = switchProba >= this.switchThreshold;
                result.modelsUsed.taskSwitch = true;

                if (result.shouldSuggestSwitch) {
                    result.reasoning.taskSwitch = `Task switch recommended (confidence: ${(switchProba * 100).toFixed(0)}%)`;
                } else {
                    result.reasoning.taskSwitch = `Continue current task`;
                }
            }
        } else {
            // Rule-based fallback
            const switchFallback = this._ruleBasedTaskSwitch(enriched);
            result.shouldSuggestSwitch = switchFallback.shouldSuggest;
            result.switchConfidence = switchFallback.confidence;
            result.reasoning.taskSwitch = switchFallback.reason;
        }

        return result;
    }

    /**
     * Energy-only prediction (backward compatibility).
     * @param {object} features
     * @returns {number|null} Energy score 0-100
     */
    async predict(features) {
        if (!this.loaded.energy) return null;
        const score = await this._predictRegressor(
            this.energySession, features, ENERGY_FEATURE_ORDER
        );
        if (score === null) return null;
        return Math.round(Math.max(0, Math.min(100, score)));
    }

    // ========================================================================
    // RULE-BASED FALLBACKS (Cold Start / Model Not Loaded)
    // ========================================================================

    _ruleBasedBreakSuggestion(features) {
        const triggers = {
            longSession: (features.session_duration || 0) > 90,
            lowVelocity: (features.velocity_15min || 50) < 35,
            errorSpike: (features.error_rate_ratio || 1) > 1.5,
            longSinceBreak: (features.time_since_break || 0) > 60,
            lowEnergy: (features.predicted_energy || 50) < 45,
        };

        const blockers = {
            inDeepWork: features.deep_work_indicator === 1,
            recentPrompt: (features.minutes_since_last_prompt || 999) < 20,
            justStarted: (features.session_duration || 0) < 15,
        };

        const triggerCount = Object.values(triggers).filter(Boolean).length;
        const blockerCount = Object.values(blockers).filter(Boolean).length;
        const shouldSuggest = triggerCount >= 2 && blockerCount === 0;
        const confidence = Math.min(triggerCount / 5, 1);

        const reasons = [];
        if (triggers.longSession) reasons.push('long session');
        if (triggers.lowEnergy) reasons.push('low energy');
        if (triggers.errorSpike) reasons.push('high error rate');
        if (triggers.longSinceBreak) reasons.push('long since break');

        return {
            shouldSuggest,
            confidence: Math.round(confidence * 100) / 100,
            reason: shouldSuggest
                ? `Break suggested (${reasons.join(', ')})`
                : 'No break needed (rule-based)',
        };
    }

    _ruleBasedTaskSwitch(features) {
        const triggers = {
            hardTaskLowEnergy: (features.current_task_complexity || 0) >= 2 && (features.predicted_energy || 50) < 55,
            taskStuck: features.task_is_stuck === 1,
            highErrorRate: (features.current_task_error_rate || 0) > 0.1,
            easyTasksAvailable: (features.num_low_complexity_available || 0) > 0 && (features.predicted_energy || 50) < 60,
        };

        const blockers = {
            inDeepWork: features.deep_work_indicator === 1,
            recentSwitch: features.recent_task_switch === 1,
            hasDependencies: features.task_has_dependencies === 1,
        };

        const triggerCount = Object.values(triggers).filter(Boolean).length;
        const blockerCount = Object.values(blockers).filter(Boolean).length;
        const shouldSuggest = triggerCount >= 2 && blockerCount === 0;
        const confidence = Math.min(triggerCount / 4, 1);

        return {
            shouldSuggest,
            confidence: Math.round(confidence * 100) / 100,
            reason: shouldSuggest
                ? 'Consider switching to a simpler task (rule-based)'
                : 'Continue current task (rule-based)',
        };
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    _getEnergyLevel(score) {
        if (score >= 80) return 'peak';
        if (score >= 60) return 'good';
        if (score >= 40) return 'low';
        return 'critical';
    }

    /**
     * Get pipeline status (for UI / IPC).
     */
    getStatus() {
        return {
            isLoaded: this.loaded.energy,
            pipelineLoaded: this.loaded,
            hasFullPipeline: this.loaded.energy && this.loaded.break && this.loaded.taskSwitch,
            featureCounts: {
                energy: ENERGY_FEATURE_ORDER.length,
                break: BREAK_FEATURE_ORDER.length,
                taskSwitch: TASK_SWITCH_FEATURE_ORDER.length,
            },
            thresholds: {
                break: this.breakThreshold,
                taskSwitch: this.switchThreshold,
            },
        };
    }
}

module.exports = new MLPipeline();
