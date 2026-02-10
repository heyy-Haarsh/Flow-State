// FlowState - Intervention Engine
// Decides when to show break suggestions, task switches, etc.

const { getBaseline, saveIntervention } = require('../database/queries');

class InterventionEngine {
    constructor() {
        this.lastInterventionTime = 0;
        this.COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between interventions
    }

    /**
     * Evaluate if an intervention should be shown
     * @param {object} context - Current state
     * @returns {object|null} Intervention to show, or null
     */
    evaluate(context) {
        const {
            currentEnergy,
            sessionDuration,
            timeSinceBreak,
            errorRate,
            baselineErrorRate,
            currentTask,
            pendingTasks,
        } = context;

        // Don't spam interventions
        if (Date.now() - this.lastInterventionTime < this.COOLDOWN_MS) {
            return null;
        }

        // Priority 1: Mandatory break (safety valve)
        if (sessionDuration > 90 && timeSinceBreak > 90) {
            return this._createIntervention({
                type: 'mandatory_break',
                title: 'Time for a Break',
                message:
                    "You've been working 90+ minutes straight. Taking a break improves focus and prevents burnout.",
                actions: ['Take Break'],
                mandatory: true,
                energyBefore: currentEnergy,
            });
        }

        // Priority 2: Energy drop + long session
        if (currentEnergy < 60 && timeSinceBreak > 45) {
            return this._createIntervention({
                type: 'break_suggestion',
                title: 'Energy Dipping',
                message: `Your energy is at ${currentEnergy}. A 5-minute break could help recharge.`,
                actions: ['Take Break', 'Dismiss'],
                energyBefore: currentEnergy,
            });
        }

        // Priority 3: High error rate → suggest easier task
        if (
            errorRate > (baselineErrorRate || 0.05) * 1.5 &&
            currentTask?.complexity === 'high'
        ) {
            const easyTasks = (pendingTasks || []).filter(
                (t) => t.complexity === 'low' || t.complexity === 'medium'
            );

            return this._createIntervention({
                type: 'task_switch',
                title: 'High Error Rate Detected',
                message: "You're making more mistakes than usual. Switch to an easier task?",
                suggestedTasks: easyTasks.slice(0, 3),
                actions: ['Switch Task', 'Keep Going'],
                energyBefore: currentEnergy,
            });
        }

        // Priority 4: Peak hours approaching
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
                    });
                }
            }
        }

        // Priority 5: Critical energy
        if (currentEnergy < 40) {
            return this._createIntervention({
                type: 'critical_energy',
                title: 'Energy Critical',
                message: `Energy at ${currentEnergy}%. Consider a longer break or wrapping up.`,
                actions: ['Take Long Break', 'End Session', 'Dismiss'],
                energyBefore: currentEnergy,
            });
        }

        return null;
    }

    _createIntervention(data) {
        this.lastInterventionTime = Date.now();

        // Save to database
        try {
            saveIntervention({
                type: data.type,
                message: data.message,
                energyBefore: data.energyBefore,
            });
        } catch (error) {
            console.error('[InterventionEngine] Error saving intervention:', error);
        }

        return data;
    }

    resetCooldown() {
        this.lastInterventionTime = 0;
    }
}

module.exports = new InterventionEngine();
