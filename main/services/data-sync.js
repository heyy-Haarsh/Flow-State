// FlowState - Data Sync Service (Multi-Model Pipeline)
// Prepares training data for all 3 ML models and handles data exports.
//
// Training data enrichment:
//   - Energy features:     Activity metrics + questionnaire data
//   - Break features:      + velocity metrics, intervention context
//   - Task switch features: + task context, complexity, dependencies

const {
    getHourlyMetrics,
    getQuestionnaireResponses,
    getBaseline,
    getTasks,
} = require('../database/queries');

class DataSync {
    /**
     * Prepare unified training data for the Python ML service.
     * Combines hourly metrics with questionnaire responses and
     * enriches with break/task-switch features where available.
     *
     * Returns data compatible with all 3 models in train_model.py.
     */
    prepareTrainingData() {
        try {
            const hourlyMetrics = getHourlyMetrics(168); // 7 days
            const questionnaires = getQuestionnaireResponses('morning_checkin');
            const baseline = getBaseline();

            if (!baseline) {
                console.warn('[DataSync] No baseline available for training data');
                return null;
            }

            const tasks = getTasks() || [];
            const trainingData = [];

            for (const q of questionnaires) {
                const qTime = new Date(q.timestamp).getTime();

                const matchingMetrics = hourlyMetrics.filter((m) => {
                    const mTime = new Date(m.hour_start).getTime();
                    return Math.abs(mTime - qTime) < 3600000; // within 1 hour
                });

                for (const metric of matchingMetrics) {
                    const hour = new Date(metric.hour_start).getHours();
                    const typingSpeed = metric.avg_typing_speed || 0;
                    const errorRate = metric.avg_error_rate || 0;
                    const typingSpeedRatio = baseline.baseline_typing_speed > 0
                        ? typingSpeed / baseline.baseline_typing_speed : 1;
                    const errorRateRatio = baseline.baseline_error_rate > 0
                        ? errorRate / baseline.baseline_error_rate : 1;

                    // Velocity calculations
                    const velocity5 = typingSpeed * (1 - Math.min(errorRate * 5, 1));
                    const velocity15 = typingSpeed * (1 - Math.min(errorRate * 3, 1));

                    trainingData.push({
                        // === Energy Model Features ===
                        typing_speed_5min: typingSpeed,
                        typing_speed_15min: typingSpeed, // TODO: separate 15min window
                        error_rate_5min: errorRate,
                        error_rate_15min: errorRate,
                        mouse_entropy: metric.mouse_entropy || 0.5,
                        idle_percentage: metric.idle_percentage || 0.1,
                        session_duration: metric.work_minutes || 0,
                        time_since_break: 0, // TODO: calculate from breaks table
                        tasks_completed_hour: metric.tasks_completed || 0,
                        hour_of_day: hour,
                        day_of_week: new Date(metric.hour_start).getDay(),
                        sleep_quality: q.sleep_quality || 5,
                        stress_level: q.stress_level || 5,
                        caffeine_intake: q.caffeine_intake || 0,
                        exercise_today: q.exercise_today ? 1 : 0,
                        expected_difficulty: q.expected_difficulty || 5,
                        typing_speed_ratio: typingSpeedRatio,
                        error_rate_ratio: errorRateRatio,

                        // === Break Model Features ===
                        velocity_5min: velocity5,
                        velocity_15min: velocity15,
                        velocity_trend: 0, // TODO: compute from velocity history
                        predicted_energy: q.current_energy || 50, // Actual as proxy
                        deep_work_indicator: (typingSpeedRatio > 0.9 && errorRateRatio < 1.2) ? 1 : 0,
                        task_switches_last_hour: 0, // TODO: track
                        user_avg_session_length: 90, // TODO: compute from history
                        historical_acceptance_rate: 0.5, // TODO: compute
                        minutes_since_last_prompt: 30,
                        last_prompt_accepted: 0,
                        prompts_dismissed_streak: 0,

                        // === Task Switch Features ===
                        current_task_complexity: 1, // Default medium
                        current_task_duration: 30,
                        current_task_progress: 0.5,
                        current_task_error_rate: errorRate,
                        task_is_stuck: 0,
                        num_low_complexity_available: 2,
                        num_high_complexity_available: 1,
                        has_urgent_simple_task: 0,
                        break_suggestion_prob: 0.3,
                        user_switch_frequency: 0.2,
                        recent_task_switch: 0,
                        task_has_dependencies: 0,

                        // === Targets ===
                        current_energy: q.current_energy || 50,
                        break_target: 0, // TODO: derive from actual break events
                        break_effectiveness: 0,
                        break_accepted: 0,
                        task_switch_target: 0, // TODO: derive from task switch events
                        user_switched: 0,
                        velocity_improved: 0,
                    });
                }
            }

            return trainingData;
        } catch (error) {
            console.error('[DataSync] Error preparing training data:', error);
            return null;
        }
    }

    /**
     * Export all user data as JSON (for privacy dashboard).
     */
    exportAllData() {
        try {
            return {
                hourlyMetrics: getHourlyMetrics(720), // 30 days
                questionnaires: getQuestionnaireResponses(),
                baseline: getBaseline(),
                tasks: getTasks(),
                exportedAt: new Date().toISOString(),
            };
        } catch (error) {
            console.error('[DataSync] Error exporting data:', error);
            return null;
        }
    }
}

module.exports = new DataSync();
