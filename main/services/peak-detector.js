const { getHourlyMetrics, savePeakAnalysisResult, clearPeakAnalysisResults } = require('../database/queries');

/**
 * PeakDetector
 * 
 * Analyzes historical hourly metrics to identify "Peak Hours" and "Peak Windows".
 * Implements the 3-pillar evaluation:
 * 1. Performance (Velocity, Energy, Focus)
 * 2. Consistency (Low variance across days)
 * 3. Sustainability (No post-peak crash)
 */
class PeakDetector {
    constructor() {
        this.WEIGHTS = {
            PERFORMANCE: 0.5,
            CONSISTENCY: 0.3,
            SUSTAINABILITY: 0.2
        };

        this.THRESHOLDS = {
            MIN_SAMPLES: 5,        // Minimum days of data required for an hour
            PEAK_SCORE: 70,        // Min score to be considered a peak
            PERFORMANCE_GATE: 55,  // Min performance score required
            CONSISTENCY_GATE: 0.4, // Min consistency score allowed
            SUSTAINABILITY_GATE: 0.3 // Min sustainability score allowed
        };
    }

    /**
     * Run the full analysis and save results to DB.
     * @returns {Promise<Object>} Summary of analysis
     */
    async runAnalysis() {
        console.log('[PeakDetector] Starting analysis...');

        // 1. Fetch raw data (last 28 days)
        // We fetch 24 * 30 hours to be safe
        const rawData = getHourlyMetrics(24 * 30);

        if (!rawData || rawData.length < 24 * 5) {
            console.log('[PeakDetector] Insufficient data for analysis.');
            return { status: 'skipped', reason: 'insufficient_data' };
        }

        // 2. Group data by context (Weekday vs Weekend) and Hour
        const buckets = this._bucketData(rawData);

        // 3. Analyze each context separately
        const results = [];

        for (const context of ['weekday', 'weekend']) {
            // Clear old results for this context to avoid staleness
            // (In a real prod system we might value history, but for now we replace)
            // Actually, queries.js handles cleanup of old IDs, so we can just append new analysis.
            // But let's clear the "current" view for this context if we want a single truth.
            // For now, let's just save new rows. Queries.js `getPeakAnalysisResults` picks the latest.

            const contextResults = this._analyzeContext(buckets[context], context);
            results.push(...contextResults);
        }

        // 4. Save results
        let savedCount = 0;
        const analysisDate = new Date().toISOString();

        // Wrap in transaction if possible, but for now loop inserts
        for (const res of results) {
            savePeakAnalysisResult({ ...res });
            savedCount++;
        }

        console.log(`[PeakDetector] Analysis complete. Saved ${savedCount} rows.`);
        return { status: 'success', rows: savedCount };
    }

    /**
     * Group raw hourly rows into buckets:
     * {
     *   weekday: { 0: [row, row], 1: [row, row] ... 23: [] },
     *   weekend: { ... }
     * }
     */
    _bucketData(rows) {
        const buckets = {
            weekday: {},
            weekend: {}
        };

        // Initialize 0-23 hours
        for (let i = 0; i < 24; i++) {
            buckets.weekday[i] = [];
            buckets.weekend[i] = [];
        }

        for (const row of rows) {
            const date = new Date(row.hour_start);
            const hour = date.getHours();
            const day = date.getDay(); // 0 = Sun, 6 = Sat

            const isWeekend = (day === 0 || day === 6);
            const context = isWeekend ? 'weekend' : 'weekday';

            buckets[context][hour].push(row);
        }

        return buckets;
    }

    /**
     * Analyze a full set of 24 hours for a specific context
     */
    _analyzeContext(hourBuckets, context) {
        const hourlyScores = [];

        // Step 1: Calculate raw scores for each hour independently
        for (let hour = 0; hour < 24; hour++) {
            const samples = hourBuckets[hour];

            if (samples.length < this.THRESHOLDS.MIN_SAMPLES) {
                // Not enough data for this hour
                hourlyScores.push(this._createEmptyResult(context, hour));
                continue;
            }

            const score = this._calculateHourScore(samples, hour, hourBuckets, context);
            hourlyScores.push(score);
        }

        // Step 2: Identify Peak Windows (Clustering)
        // We look for adjacent hours that are both "Peaks" (or close to it)
        const clustered = this._clusterWindows(hourlyScores);

        return clustered;
    }

    _calculateHourScore(samples, hour, allBuckets, context) {
        // --- 1. Performance Score ---
        // Metrics: speed, energy, tasks (normalized)
        // We need 'global' stats to normalize against, but for simplicity 
        // we'll assume some reasonable bounds or calculate local max if we had time.
        // Let's use simple fixed clamping for V1.

        const perfValues = samples.map(s => {
            // Normalize inputs to roughly 0-1 range
            const speedScore = Math.min(s.avg_typing_speed / 80, 1.2); // Assume 80 wpm is "high"
            const energyScore = s.avg_energy_score / 100;
            const errorFactor = Math.max(0, 1 - (s.avg_error_rate * 10)); // 10% error rate = 0 score
            const taskFactor = Math.min(s.tasks_completed / 3, 1.0); // 3 tasks/hr is good

            // Weighted sum for this sample
            // Speed 30%, Energy 40%, Error 20%, Tasks 10%
            return (speedScore * 0.3) + (energyScore * 0.4) + (errorFactor * 0.2) + (taskFactor * 0.1);
        });

        // Current Hour Performance = Average of sample performances
        const avgPerf = perfValues.reduce((a, b) => a + b, 0) / perfValues.length;
        const performanceScore = Math.min(avgPerf * 100, 100);

        // --- 2. Consistency Score ---
        // CV = StdDev / Mean
        const mean = avgPerf;
        if (mean === 0) return this._createEmptyResult(context, hour);

        const variance = perfValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / perfValues.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;

        // Map CV to 0-1 Score. CV=0 -> 1.0, CV=0.5 -> 0.5, CV>1 -> 0
        const consistencyScore = Math.max(0, 1 - cv);

        // --- 3. Sustainability Score ---
        // Check next hour (H+1)
        const nextHour = (hour + 1) % 24;
        const nextHourSamples = allBuckets[nextHour];

        let sustainabilityScore = 1.0; // Assume perfect unless proven otherwise

        if (nextHourSamples && nextHourSamples.length >= this.THRESHOLDS.MIN_SAMPLES) {
            // Simple check: Does energy/perf drop drastically in the next hour?
            // We compare average Expected Energy of H vs H+1
            const currentAvgEnergy = samples.reduce((a, s) => a + s.avg_energy_score, 0) / samples.length;
            const nextAvgEnergy = nextHourSamples.reduce((a, s) => a + s.avg_energy_score, 0) / nextHourSamples.length;

            const drop = currentAvgEnergy - nextAvgEnergy;
            if (drop > 20) {
                // Significant crash (> 20 energy points)
                sustainabilityScore = 0.4;
            } else if (drop > 10) {
                sustainabilityScore = 0.7;
            }
        }

        // --- Composite Score ---
        let peakScore = (
            (performanceScore * this.WEIGHTS.PERFORMANCE) +
            (consistencyScore * 100 * this.WEIGHTS.CONSISTENCY) +
            (sustainabilityScore * 100 * this.WEIGHTS.SUSTAINABILITY)
        );

        // Gatekeepers
        if (performanceScore < this.THRESHOLDS.PERFORMANCE_GATE) peakScore *= 0;
        if (consistencyScore < this.THRESHOLDS.CONSISTENCY_GATE) peakScore *= 0;
        if (sustainabilityScore < this.THRESHOLDS.SUSTAINABILITY_GATE) peakScore *= 0;

        // Confidence calculation (simple proxy based on sample size)
        const confidence = Math.min(samples.length / 20, 1.0); // 20 samples = 100% confidence

        return {
            context,
            hourOfDay: hour,
            isPeak: peakScore >= this.THRESHOLDS.PEAK_SCORE,
            peakScore: parseFloat(peakScore.toFixed(1)),
            performanceScore: parseFloat(performanceScore.toFixed(1)),
            consistencyScore: parseFloat(consistencyScore.toFixed(2)),
            sustainabilityScore: parseFloat(sustainabilityScore.toFixed(2)),
            confidenceLevel: parseFloat(confidence.toFixed(2)),
            windowGroupId: null // Assigned later
        };
    }

    _clusterWindows(results) {
        let currentGroupId = 1;
        let inWindow = false;

        for (let i = 0; i < results.length; i++) {
            const row = results[i];

            if (row.isPeak) {
                if (!inWindow) {
                    // Start new window
                    currentGroupId++;
                    inWindow = true;
                }
                row.windowGroupId = currentGroupId;
            } else {
                // Gap in peaks
                // FUTURE: Allows small gaps? For now, strict contiguous.
                inWindow = false;
            }
        }
        return results;
    }

    _createEmptyResult(context, hour) {
        return {
            context,
            hourOfDay: hour,
            isPeak: false,
            peakScore: 0,
            performanceScore: 0,
            consistencyScore: 0,
            sustainabilityScore: 0,
            confidenceLevel: 0,
            windowGroupId: null
        };
    }
}

module.exports = PeakDetector;
