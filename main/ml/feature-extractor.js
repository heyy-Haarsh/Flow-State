// FlowState - Feature Extractor (Multi-Model Pipeline)
// Prepares real-time features for all 3 ML models:
//   1. Energy Predictor
//   2. Break Suggester
//   3. Task Switch Recommender

const { getRecentEvents, getBaseline, getSetting, getCompletedTasksCount } = require('../database/queries');

// --- Model 1: Energy features (same as before) ---
const ENERGY_FEATURE_ORDER = [
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

// --- Model 2: Break suggestion features ---
const BREAK_FEATURE_ORDER = [
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
];

// --- Model 3: Task switch features ---
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

// Backward compatibility
const FEATURE_ORDER = ENERGY_FEATURE_ORDER;

// Velocity history for trend calculation
let velocityHistory = [];
let lastTaskSwitchTime = 0;
let lastPromptTime = 0;
let lastPromptAccepted = false;
let promptsDismissedStreak = 0;

/**
 * Extract current features for ALL ML models.
 * Returns a unified feature map that covers all 3 models.
 * 
 * @param {object} sessionContext - Current session info from the app
 * @returns {object} Unified feature map
 */
function extractCurrentFeatures(sessionContext = {}) {
    const baseline = getBaseline() || {
        baseline_typing_speed: 50,
        baseline_error_rate: 0.05,
    };

    // Get recent activity events
    const events5min = getRecentEvents(5);
    const events15min = getRecentEvents(15);

    // Helper to average metric values by type
    const avgMetric = (events, type) => {
        const filtered = events.filter((e) => e.event_type === type);
        if (filtered.length === 0) return 0;
        return filtered.reduce((sum, e) => sum + e.metric_value, 0) / filtered.length;
    };

    const typingSpeed5 = avgMetric(events5min, 'typing_speed');
    const typingSpeed15 = avgMetric(events15min, 'typing_speed');
    const errorRate5 = avgMetric(events5min, 'error_rate');
    const errorRate15 = avgMetric(events15min, 'error_rate');
    const mouseEntropy = avgMetric(events5min, 'mouse_entropy') || 0.5;
    const idlePercentage = avgMetric(events5min, 'idle_percentage') || 0.1;

    const now = new Date();
    const typingSpeedRatio = baseline.baseline_typing_speed > 0
        ? typingSpeed5 / baseline.baseline_typing_speed : 1;
    const errorRateRatio = baseline.baseline_error_rate > 0
        ? errorRate5 / baseline.baseline_error_rate : 1;

    // --- Velocity calculations ---
    const velocity5 = typingSpeed5 * (1 - errorRate5 * 5);
    const velocity15 = typingSpeed15 * (1 - errorRate15 * 3);

    velocityHistory.push(velocity15);
    if (velocityHistory.length > 10) velocityHistory.shift();

    let velocityTrend = 0;
    if (velocityHistory.length >= 3) {
        const recent = velocityHistory[velocityHistory.length - 1] - velocityHistory[velocityHistory.length - 3];
        velocityTrend = recent > 3 ? 1 : (recent < -3 ? -1 : 0);
    }

    // --- Deep work indicator ---
    const deepWork = (
        typingSpeedRatio > 0.9 &&
        errorRateRatio < 1.2 &&
        (sessionContext.timeSinceBreak || 0) < 60 &&
        idlePercentage < 0.15
    );

    // --- Task context ---
    const currentTask = sessionContext.currentTask || {};
    const pendingTasks = sessionContext.pendingTasks || [];
    const lowTasks = pendingTasks.filter(t => t.complexity === 'low').length;
    const highTasks = pendingTasks.filter(t => t.complexity === 'high').length;

    const taskComplexityMap = { 'low': 0, 'medium': 1, 'high': 2 };
    const currentTaskComplexity = taskComplexityMap[currentTask.complexity] || 1;
    const currentTaskDuration = currentTask.duration || 0;
    const currentTaskProgress = currentTask.progress || 0;
    const currentTaskErrorRate = errorRate5 * (1 + currentTaskComplexity * 0.3);
    const taskIsStuck = (currentTaskDuration > 15 && currentTaskProgress < 0.1) ? 1 : 0;
    const hasUrgentSimple = pendingTasks.some(t => t.urgent && t.complexity === 'low') ? 1 : 0;

    const minutesSinceSwitch = (Date.now() - lastTaskSwitchTime) / 60000;
    const recentTaskSwitch = minutesSinceSwitch < 10 ? 1 : 0;
    const taskHasDeps = currentTask.hasDependencies ? 1 : 0;

    // --- Intervention context ---
    const minutesSincePrompt = (Date.now() - lastPromptTime) / 60000;

    // Build unified feature map
    const features = {
        // === Energy Model Features ===
        typing_speed_5min: typingSpeed5,
        typing_speed_15min: typingSpeed15,
        error_rate_5min: errorRate5,
        error_rate_15min: errorRate15,
        mouse_entropy: mouseEntropy,
        idle_percentage: idlePercentage,
        session_duration: sessionContext.sessionDuration || 0,
        time_since_break: sessionContext.timeSinceBreak || 0,
        tasks_completed_hour: sessionContext.tasksCompletedHour || 0,
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),

        // Questionnaire data
        sleep_quality: sessionContext.sleepQuality || 5,
        stress_level: sessionContext.stressLevel || 5,
        caffeine_intake: sessionContext.caffeineIntake || 0,
        exercise_today: sessionContext.exerciseToday ? 1 : 0,
        expected_difficulty: sessionContext.expectedDifficulty || 5,

        // Baseline ratios
        typing_speed_ratio: typingSpeedRatio,
        error_rate_ratio: errorRateRatio,

        // === Break Model Features (additional) ===
        velocity_5min: velocity5,
        velocity_15min: velocity15,
        velocity_trend: velocityTrend,
        predicted_energy: 50,  // Placeholder: set by pipeline at inference time
        deep_work_indicator: deepWork ? 1 : 0,
        task_switches_last_hour: sessionContext.taskSwitchesLastHour || 0,
        user_avg_session_length: sessionContext.userAvgSessionLength || 90,
        historical_acceptance_rate: sessionContext.historicalAcceptanceRate || 0.5,
        minutes_since_last_prompt: Math.min(minutesSincePrompt, 999),
        last_prompt_accepted: lastPromptAccepted ? 1 : 0,
        prompts_dismissed_streak: promptsDismissedStreak,

        // === Task Switch Features (additional) ===
        current_task_complexity: currentTaskComplexity,
        current_task_duration: currentTaskDuration,
        current_task_progress: currentTaskProgress,
        current_task_error_rate: currentTaskErrorRate,
        task_is_stuck: taskIsStuck,
        num_low_complexity_available: lowTasks,
        num_high_complexity_available: highTasks,
        has_urgent_simple_task: hasUrgentSimple,
        break_suggestion_prob: 0,  // Placeholder: set by pipeline at inference time
        user_switch_frequency: sessionContext.userSwitchFrequency || 0.2,
        recent_task_switch: recentTaskSwitch,
        task_has_dependencies: taskHasDeps,
    };

    return features;
}

/**
 * Convert features object to ordered Float32Array for ONNX
 * @param {object} features - Feature map
 * @param {string[]} featureOrder - Feature names in model order
 */
function featuresToTensor(features, featureOrder = ENERGY_FEATURE_ORDER) {
    return new Float32Array(
        featureOrder.map((key) => Number(features[key]) || 0)
    );
}

/**
 * Record user response to an intervention prompt.
 * Updates tracking state for break/intervention features.
 */
function recordInterventionResponse(accepted) {
    lastPromptTime = Date.now();
    lastPromptAccepted = accepted;
    if (accepted) {
        promptsDismissedStreak = 0;
    } else {
        promptsDismissedStreak++;
    }
}

/**
 * Record a task switch event.
 */
function recordTaskSwitch() {
    lastTaskSwitchTime = Date.now();
}

/**
 * Reset velocity and intervention tracking (e.g., on session start).
 */
function resetTracking() {
    velocityHistory = [];
    lastTaskSwitchTime = 0;
    lastPromptTime = 0;
    lastPromptAccepted = false;
    promptsDismissedStreak = 0;
}

module.exports = {
    extractCurrentFeatures,
    featuresToTensor,
    recordInterventionResponse,
    recordTaskSwitch,
    resetTracking,
    FEATURE_ORDER,
    ENERGY_FEATURE_ORDER,
    BREAK_FEATURE_ORDER,
    TASK_SWITCH_FEATURE_ORDER,
};
