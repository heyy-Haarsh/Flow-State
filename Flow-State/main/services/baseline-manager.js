// FlowState - Baseline Manager
// Calculates user baseline during Week 1 calibration

const { getRecentEvents, getHourlyMetrics, saveBaseline } = require('../database/queries');

class BaselineManager {
    /**
     * Calculate baseline from Week 1 data
     * Called after 7 days of data collection
     */
    calculateBaseline() {
        try {
            const hourlyMetrics = getHourlyMetrics(168); // 7 days = 168 hours

            if (hourlyMetrics.length < 24) {
                console.warn('[BaselineManager] Not enough data for baseline (need at least 24 hours)');
                return null;
            }

            // Average typing speed
            const typingSpeeds = hourlyMetrics
                .map((m) => m.avg_typing_speed)
                .filter((v) => v > 0);
            const avgTypingSpeed =
                typingSpeeds.reduce((a, b) => a + b, 0) / typingSpeeds.length || 50;

            // Average error rate
            const errorRates = hourlyMetrics
                .map((m) => m.avg_error_rate)
                .filter((v) => v >= 0);
            const avgErrorRate =
                errorRates.reduce((a, b) => a + b, 0) / errorRates.length || 0.05;

            // Tasks per day
            const dailyTasks = {};
            hourlyMetrics.forEach((m) => {
                const date = m.hour_start.split('T')[0];
                dailyTasks[date] = (dailyTasks[date] || 0) + (m.tasks_completed || 0);
            });
            const daysWithData = Object.keys(dailyTasks).length || 1;
            const avgTasksPerDay =
                Object.values(dailyTasks).reduce((a, b) => a + b, 0) / daysWithData;

            // Peak hours (top 3 hours by energy/productivity)
            const hourlyAvgs = {};
            hourlyMetrics.forEach((m) => {
                const hour = new Date(m.hour_start).getHours();
                if (!hourlyAvgs[hour]) hourlyAvgs[hour] = [];
                hourlyAvgs[hour].push(m.avg_energy_score || m.avg_typing_speed);
            });

            const peakHours = Object.entries(hourlyAvgs)
                .map(([hour, values]) => ({
                    hour: parseInt(hour),
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                }))
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 4)
                .map((h) => h.hour)
                .sort((a, b) => a - b);

            // Energy curve (hourly energy pattern)
            const energyCurve = {};
            Object.entries(hourlyAvgs).forEach(([hour, values]) => {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                energyCurve[parseInt(hour)] = Math.round(avg);
            });

            const baseline = {
                typingSpeed: Math.round(avgTypingSpeed),
                errorRate: +avgErrorRate.toFixed(4),
                tasksPerDay: Math.round(avgTasksPerDay),
                peakHours,
                energyCurve,
            };

            // Save to database
            saveBaseline(baseline);

            console.log('[BaselineManager] Baseline calculated:', baseline);
            return baseline;
        } catch (error) {
            console.error('[BaselineManager] Error calculating baseline:', error);
            return null;
        }
    }
}

module.exports = new BaselineManager();
