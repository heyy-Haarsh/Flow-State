// FlowState - Activity Aggregator
// Batches raw activity events into hourly metrics

const { getRecentEvents, insertHourlyMetric } = require('../database/queries');

class ActivityAggregator {
    constructor() {
        this.intervalId = null;
    }

    start() {
        // Aggregate every hour
        this.intervalId = setInterval(() => {
            this.aggregateHourlyMetrics();
        }, 3600000); // 1 hour

        console.log('[ActivityAggregator] Started');
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[ActivityAggregator] Stopped');
    }

    aggregateHourlyMetrics() {
        try {
            const events = getRecentEvents(60); // last 60 minutes

            if (events.length === 0) return;

            // Group by event type
            const typingSpeedEvents = events.filter((e) => e.event_type === 'typing_speed');
            const errorRateEvents = events.filter((e) => e.event_type === 'error_rate');
            const entropyEvents = events.filter((e) => e.event_type === 'mouse_entropy');
            const idleEvents = events.filter((e) => e.event_type === 'idle_percentage');

            // Calculate averages
            const avg = (arr) =>
                arr.length > 0
                    ? arr.reduce((sum, e) => sum + e.metric_value, 0) / arr.length
                    : 0;

            const hourlyData = {
                hourStart: new Date().toISOString().slice(0, 13) + ':00:00',
                avgTypingSpeed: avg(typingSpeedEvents),
                avgErrorRate: avg(errorRateEvents),
                mouseEntropy: avg(entropyEvents),
                idlePercentage: avg(idleEvents),
                tasksCompleted: 0, // TODO: fetch from tasks table
                avgEnergyScore: 0, // TODO: fetch from energy calculator
                workMinutes: Math.min(60, events.length), // rough estimate
            };

            insertHourlyMetric(hourlyData);
            console.log('[ActivityAggregator] Hourly metrics saved');
        } catch (error) {
            console.error('[ActivityAggregator] Error aggregating metrics:', error);
        }
    }
}

module.exports = new ActivityAggregator();
