// FlowState - Data Sync Service
// Prepares data for ML training and exports

const {
    getHourlyMetrics,
    getQuestionnaireResponses,
    getBaseline,
    getTasks,
} = require('../database/queries');

class DataSync {
    /**
     * Prepare training data for the Python ML service
     * Combines hourly metrics with questionnaire responses
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

            // Create training records by matching metrics with questionnaire responses
            const trainingData = [];

            for (const q of questionnaires) {
                // Find hourly metrics closest to questionnaire timestamp
                const qTime = new Date(q.timestamp).getTime();

                const matchingMetrics = hourlyMetrics.filter((m) => {
                    const mTime = new Date(m.hour_start).getTime();
                    return Math.abs(mTime - qTime) < 3600000; // within 1 hour
                });

                for (const metric of matchingMetrics) {
                    trainingData.push({
                        // Features from activity monitoring
                        typing_speed_5min: metric.avg_typing_speed,
                        typing_speed_15min: metric.avg_typing_speed, // TODO: separate 15min aggregation
                        error_rate_5min: metric.avg_error_rate,
                        error_rate_15min: metric.avg_error_rate,
                        mouse_entropy: metric.mouse_entropy,
                        idle_percentage: metric.idle_percentage,
                        session_duration: metric.work_minutes,
                        time_since_break: 0, // TODO: calculate from breaks table
                        tasks_completed_hour: metric.tasks_completed,

                        // Temporal features
                        hour_of_day: new Date(metric.hour_start).getHours(),
                        day_of_week: new Date(metric.hour_start).getDay(),

                        // Questionnaire features
                        sleep_quality: q.sleep_quality,
                        stress_level: q.stress_level,
                        caffeine_intake: q.caffeine_intake,
                        exercise_today: q.exercise_today ? 1 : 0,
                        expected_difficulty: q.expected_difficulty,

                        // Baseline ratios
                        typing_speed_ratio:
                            baseline.baseline_typing_speed > 0
                                ? metric.avg_typing_speed / baseline.baseline_typing_speed
                                : 1,
                        error_rate_ratio:
                            baseline.baseline_error_rate > 0
                                ? metric.avg_error_rate / baseline.baseline_error_rate
                                : 1,

                        // Target variable (ground truth)
                        current_energy: q.current_energy,
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
     * Export all user data as JSON (for privacy dashboard)
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
