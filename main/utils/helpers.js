// FlowState - Helper Utilities

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique session ID
 */
function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clamp a number between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate average of an array of numbers
 */
function average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(arr) {
    if (arr.length < 2) return 0;
    const mean = average(arr);
    const squareDiffs = arr.map((value) => Math.pow(value - mean, 2));
    return Math.sqrt(average(squareDiffs));
}

/**
 * Get day number since app installation
 */
function getDayNumber(installDate) {
    const now = new Date();
    const install = new Date(installDate);
    const diffTime = Math.abs(now - install);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format minutes to "Xh Ym" string
 */
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
}

module.exports = {
    generateSessionId,
    clamp,
    average,
    standardDeviation,
    getDayNumber,
    formatDuration,
};
