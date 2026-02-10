// FlowState - Rule-Based Energy Calculator (Fallback)
// Used before ML model is trained (Week 1 and as fallback)

const { getRecentEvents, getBaseline } = require('../database/queries');

const DEFAULT_BASELINE = {
    baseline_typing_speed: 50,
    baseline_error_rate: 0.05,
    baseline_tasks_per_day: 6,
};

function getTimeOfDayMultiplier(hour) {
    const curve = [
        0.3, 0.2, 0.15, 0.15, 0.2, 0.35, // 0-5
        0.5, 0.65, 0.8, 0.9, 1.0, 0.95,   // 6-11
        0.8, 0.7, 0.75, 0.9, 0.85, 0.75,  // 12-17
        0.6, 0.5, 0.45, 0.4, 0.35, 0.3,   // 18-23
    ];
    return curve[hour] ?? 0.5;
}

function calculateEnergy(sessionDuration = 0, timeSinceBreak = 0) {
    const events = getRecentEvents(15); // last 15 minutes
    const baseline = getBaseline() || DEFAULT_BASELINE;

    // Extract metrics from events
    const typingSpeedEvents = events.filter((e) => e.event_type === 'typing_speed');
    const errorRateEvents = events.filter((e) => e.event_type === 'error_rate');
    const idleEvents = events.filter((e) => e.event_type === 'idle_percentage');

    const avg = (arr) =>
        arr.length > 0
            ? arr.reduce((sum, e) => sum + e.metric_value, 0) / arr.length
            : 0;

    const avgTypingSpeed = avg(typingSpeedEvents) || baseline.baseline_typing_speed;
    const avgErrorRate = avg(errorRateEvents) || baseline.baseline_error_rate;
    const idlePercentage = avg(idleEvents) || 0.1;

    // Calculate ratios
    const typingSpeedRatio = avgTypingSpeed / baseline.baseline_typing_speed;
    const errorRateRatio = avgErrorRate / baseline.baseline_error_rate;

    const hour = new Date().getHours();

    // Weighted composite score
    let energyScore =
        typingSpeedRatio * 30 +
        (2 - Math.min(errorRateRatio, 2)) * 25 +
        (1 - idlePercentage) * 15 +
        getTimeOfDayMultiplier(hour) * 10;

    // Normalize to approximate 0-100 range
    energyScore = (energyScore / 80) * 100;

    // Session fatigue penalty
    if (sessionDuration > 60) energyScore *= 0.95;
    if (sessionDuration > 90) energyScore *= 0.90;
    if (sessionDuration > 120) energyScore *= 0.85;

    // Break deficit penalty
    if (timeSinceBreak > 60) energyScore *= 0.92;

    return Math.round(Math.max(0, Math.min(100, energyScore)));
}

function getEnergyLevel(score) {
    if (score >= 80) return 'peak';
    if (score >= 60) return 'good';
    if (score >= 40) return 'low';
    return 'critical';
}

function getEnergyColor(score) {
    if (score >= 80) return '#3B82F6'; // Blue
    if (score >= 60) return '#10B981'; // Green
    if (score >= 40) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
}

module.exports = { calculateEnergy, getEnergyLevel, getEnergyColor, getTimeOfDayMultiplier };
