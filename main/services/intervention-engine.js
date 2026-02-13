// FlowState - ML-Powered Intervention Engine
// Decides when to show break suggestions, task switches, etc.
// Uses the ML pipeline when available, with rule-based fallback.
//
// Intervention types:
//   - mandatory_break:   Safety valve (90+ min straight)
//   - break_suggestion:  ML/rule-based break recommendation
//   - task_switch:       ML/rule-based task switch recommendation
//   - peak_hours_alert:  Upcoming peak focus hours
//   - critical_energy:   Energy critically low

const { getBaseline, saveIntervention } = require('../database/queries');
const mlPipeline = require('./ml-inference');

class InterventionEngine {
    constructor() {
        this.lastInterventionTime = 0;
        this.COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between interventions

        // Intervention tracking (for ML features)
        this.lastBreakAccepted = false;
        this.dismissedStreak = 0;
        this.totalSuggested = 0;
        this.totalAccepted = 0;
    }

    /**
     * Evaluate if an intervention should be shown.
     * Uses the full ML pipeline when available.
     *
     * @param {object} context - Current state from main.js
     * @param {object} pipelineResult - Result from mlPipeline.predictPipeline() (optional)
     * @returns {object|null} Intervention to show, or null
     */
    evaluate(context, pipelineResult = null) {
        const {
            currentEnergy = 50,
            sessionDuration = 0,
            timeSinceBreak = 0,
            errorRate = 0,
            baselineErrorRate = 0.05,
            currentTask = {},
            pendingTasks = [],
        } = context;

        // Don't spam interventions
        if (Date.now() - this.lastInterventionTime < this.COOLDOWN_MS) {
            return null;
        }

        // ================================================================
        // Priority 1: Mandatory break (safety valve — always rule-based)
        // ================================================================
        if (sessionDuration > 90 && timeSinceBreak > 90) {
            return this._createIntervention({
                type: 'mandatory_break',
                title: 'Time for a Break',
                message:
                    "You've been working 90+ minutes straight. Taking a break improves focus and prevents burnout.",
                actions: ['Take Break'],
                mandatory: true,
                energyBefore: currentEnergy,
                confidence: 1.0,
                source: 'rule',
            });
        }

        // ================================================================
        // Priority 2: ML-powered break suggestion
        // ================================================================
        if (pipelineResult && pipelineResult.shouldSuggestBreak) {
            const energyScore = pipelineResult.energyScore || currentEnergy;
            return this._createIntervention({
                type: 'break_suggestion',
                title: 'Energy Dipping',
                message: `Your energy is at ${energyScore}. A 5-minute break could help recharge.`,
                actions: ['Take Break', 'Dismiss'],
                energyBefore: energyScore,
                confidence: pipelineResult.breakConfidence,
                source: pipelineResult.modelsUsed?.break ? 'ml' : 'rule',
                reasoning: pipelineResult.reasoning?.break,
            });
        }

        // ================================================================
        // Priority 3: ML-powered task switch recommendation
        // ================================================================
        if (pipelineResult && pipelineResult.shouldSuggestSwitch) {
            const easyTasks = (pendingTasks || []).filter(
                (t) => t.complexity === 'low' || t.complexity === 'medium'
            );

            if (easyTasks.length > 0) {
                return this._createIntervention({
                    type: 'task_switch',
                    title: 'Switch to Easier Task?',
                    message:
                        "The model suggests you'd be more productive switching to a simpler task right now.",
                    suggestedTasks: easyTasks.slice(0, 3),
                    actions: ['Switch Task', 'Keep Going'],
                    energyBefore: pipelineResult.energyScore || currentEnergy,
                    confidence: pipelineResult.switchConfidence,
                    source: pipelineResult.modelsUsed?.taskSwitch ? 'ml' : 'rule',
                    reasoning: pipelineResult.reasoning?.taskSwitch,
                });
            }
        }

        // ================================================================
        // Priority 4: Rule-based fallbacks (when ML doesn't trigger)
        // ================================================================

        // 4a. Energy drop + long session (fallback if ML inactive)
        if (!pipelineResult && currentEnergy < 60 && timeSinceBreak > 45) {
            return this._createIntervention({
                type: 'break_suggestion',
                title: 'Energy Dipping',
                message: `Your energy is at ${currentEnergy}. A 5-minute break could help recharge.`,
                actions: ['Take Break', 'Dismiss'],
                energyBefore: currentEnergy,
                confidence: 0.6,
                source: 'rule',
            });
        }

        // 4b. High error rate → suggest easier task (fallback)
        if (
            !pipelineResult &&
            errorRate > (baselineErrorRate || 0.05) * 1.5 &&
            currentTask?.complexity === 'high'
        ) {
            const easyTasks = (pendingTasks || []).filter(
                (t) => t.complexity === 'low' || t.complexity === 'medium'
            );

            if (easyTasks.length > 0) {
                return this._createIntervention({
                    type: 'task_switch',
                    title: 'High Error Rate Detected',
                    message:
                        "You're making more mistakes than usual. Switch to an easier task?",
                    suggestedTasks: easyTasks.slice(0, 3),
                    actions: ['Switch Task', 'Keep Going'],
                    energyBefore: currentEnergy,
                    confidence: 0.5,
                    source: 'rule',
                });
            }
        }

        // ================================================================
        // Priority 5: Peak hours approaching
        // ================================================================
        const baseline = getBaseline();
        if (baseline) {
            const peakHours = JSON.parse(baseline.peak_hours || '[]');
            const currentHour = new Date().getHours();
            const nextHour = currentHour + 1;

            if (peakHours.includes(nextHour)) {
                const hardTasks = (pendingTasks || []).filter(
                    (t) => t.complexity === 'high'
                );

                if (hardTasks.length > 0) {
                    return this._createIntervention({
                        type: 'peak_hours_alert',
                        title: 'Peak Focus Window Starting',
                        message:
                            'Your best hours are coming up. Ready for challenging work?',
                        suggestedTasks: hardTasks.slice(0, 3),
                        actions: ['Start Hard Task', 'Not Now'],
                        energyBefore: currentEnergy,
                        confidence: 0.7,
                        source: 'rule',
                    });
                }
            }
        }

        // ================================================================
        // Priority 6: Critical energy
        // ================================================================
        const effectiveEnergy = pipelineResult?.energyScore || currentEnergy;
        if (effectiveEnergy < 40) {
            return this._createIntervention({
                type: 'critical_energy',
                title: 'Energy Critical',
                message: `Energy at ${effectiveEnergy}%. Consider a longer break or wrapping up.`,
                actions: ['Take Long Break', 'End Session', 'Dismiss'],
                energyBefore: effectiveEnergy,
                confidence: 0.9,
                source: pipelineResult ? 'ml' : 'rule',
            });
        }

        return null;
    }

    /**
     * Create and log an intervention.
     */
    _createIntervention(data) {
        this.lastInterventionTime = Date.now();
        this.totalSuggested++;

        const intervention = {
            id: `intv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            ...data,
        };

        // Save to database
        try {
            saveIntervention({
                type: data.type,
                message: data.message,
                energyBefore: data.energyBefore,
                confidence: data.confidence,
                source: data.source,
            });
        } catch (error) {
            console.error('[InterventionEngine] Error saving intervention:', error);
        }

        return intervention;
    }

    /**
     * Record user response to an intervention.
     * Updates internal tracking state for ML features.
     */
    recordResponse(interventionId, accepted) {
        if (accepted) {
            this.lastBreakAccepted = true;
            this.dismissedStreak = 0;
            this.totalAccepted++;
        } else {
            this.lastBreakAccepted = false;
            this.dismissedStreak++;
        }
    }

    /**
     * Get intervention tracking state (for feature extraction).
     */
    getTrackingState() {
        return {
            lastPromptAccepted: this.lastBreakAccepted,
            promptsDismissedStreak: this.dismissedStreak,
            historicalAcceptanceRate: this.totalSuggested > 0
                ? this.totalAccepted / this.totalSuggested
                : 0.5,
            minutesSinceLastPrompt: (Date.now() - this.lastInterventionTime) / 60000,
        };
    }

    /**
     * Reset cooldown (e.g., after a break).
     */
    resetCooldown() {
        this.lastInterventionTime = 0;
    }

    /**
     * Set cooldown duration.
     */
    setCooldown(ms) {
        this.COOLDOWN_MS = ms;
    }
}

module.exports = new InterventionEngine();
