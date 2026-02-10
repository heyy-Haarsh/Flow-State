// FlowState - Feature Extractor
// Prepares real-time features for ML model prediction

const { getRecentEvents, getBaseline, getSetting } = require('../database/queries');

const FEATURE_ORDER = [
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

/**
 * Extract current features for ML model prediction
 * @param {object} sessionContext - Current session info
 * @returns {object} Feature map matching model input
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

    const now = new Date();

    const features = {
        typing_speed_5min: typingSpeed5,
        typing_speed_15min: typingSpeed15,
        error_rate_5min: errorRate5,
        error_rate_15min: errorRate15,
        mouse_entropy: avgMetric(events5min, 'mouse_entropy') || 0.5,
        idle_percentage: avgMetric(events5min, 'idle_percentage') || 0.1,
        session_duration: sessionContext.sessionDuration || 0,
        time_since_break: sessionContext.timeSinceBreak || 0,
        tasks_completed_hour: sessionContext.tasksCompletedHour || 0,
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),

        // From today's morning questionnaire (stored in context)
        sleep_quality: sessionContext.sleepQuality || 5,
        stress_level: sessionContext.stressLevel || 5,
        caffeine_intake: sessionContext.caffeineIntake || 0,
        exercise_today: sessionContext.exerciseToday ? 1 : 0,
        expected_difficulty: sessionContext.expectedDifficulty || 5,

        // Baseline ratios
        typing_speed_ratio:
            baseline.baseline_typing_speed > 0
                ? typingSpeed5 / baseline.baseline_typing_speed
                : 1,
        error_rate_ratio:
            baseline.baseline_error_rate > 0
                ? errorRate5 / baseline.baseline_error_rate
                : 1,
    };

    return features;
}

/**
 * Convert features object to ordered Float32Array for ONNX
 */
function featuresToTensor(features) {
    return new Float32Array(
        FEATURE_ORDER.map((key) => Number(features[key]) || 0)
    );
}

module.exports = { extractCurrentFeatures, featuresToTensor, FEATURE_ORDER };
