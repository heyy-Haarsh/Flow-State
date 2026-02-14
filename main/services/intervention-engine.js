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
const notificationManager = require('./notification-manager');

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
                _sessionDuration: sessionDuration,
                _timeSinceBreak: timeSinceBreak,
                _errorRate: errorRate,
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
                message: `Your energy is at ${energyScore}. A short break could help recharge.`,
                actions: ['Take Break', 'Dismiss'],
                energyBefore: energyScore,
                confidence: pipelineResult.breakConfidence,
                source: pipelineResult.modelsUsed?.break ? 'ml' : 'rule',
                reasoning: pipelineResult.reasoning?.break,
                _sessionDuration: sessionDuration,
                _timeSinceBreak: timeSinceBreak,
                _errorRate: errorRate,
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
                message: `Your energy is at ${currentEnergy}. A short break could help recharge.`,
                actions: ['Take Break', 'Dismiss'],
                energyBefore: currentEnergy,
                confidence: 0.6,
                source: 'rule',
                _sessionDuration: sessionDuration,
                _timeSinceBreak: timeSinceBreak,
                _errorRate: errorRate,
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
                _sessionDuration: sessionDuration,
                _timeSinceBreak: timeSinceBreak,
                _errorRate: errorRate,
            });
        }

        return null;
    }

    /**
     * Recommend the optimal break TYPE based on the user's current state.
     * 
     * This is the "god-level" feature: instead of just saying "take a break",
     * we analyze WHY you need a break and recommend the specific type that
     * will help most.
     * 
     * Break types (ranked by priority):
     *   🧘 breathing    — High stress, anxiety signals
     *   🚶 movement     — Long sitting, physical fatigue
     *   👁️ eye_rest     — Screen fatigue, high typing volume
     *   🎨 creative     — Mental block, high error rate
     *   🥤 hydration    — Afternoon slump, long session without break
     *   💬 social       — Isolation, long solo session
     * 
     * @param {object} context - Current state
     * @param {object} pipelineResult - ML pipeline result
     * @returns {object} Break recommendation
     */
    _recommendBreakType(context, pipelineResult = null) {
        const {
            currentEnergy = 50,
            sessionDuration = 0,
            timeSinceBreak = 0,
            errorRate = 0,
            stressLevel = 5,
        } = context;

        const hour = new Date().getHours();
        const energy = pipelineResult?.energyScore || currentEnergy;

        // Score each break type based on current signals
        const scores = {
            breathing: 0,
            movement: 0,
            eye_rest: 0,
            creative: 0,
            hydration: 0,
            social: 0,
        };

        // --- Signal: High stress → Breathing/Mindfulness ---
        if (stressLevel >= 7) scores.breathing += 40;
        else if (stressLevel >= 5) scores.breathing += 20;

        // --- Signal: Very low energy → Breathing to reset ---
        if (energy < 30) scores.breathing += 25;

        // --- Signal: Long session → Movement break ---
        if (sessionDuration > 90) scores.movement += 45;
        else if (sessionDuration > 60) scores.movement += 30;
        else if (sessionDuration > 30) scores.movement += 15;

        // --- Signal: Long since last break → Movement ---
        if (timeSinceBreak > 60) scores.movement += 25;
        else if (timeSinceBreak > 40) scores.movement += 15;

        // --- Signal: High typing volume → Eye rest ---
        if (sessionDuration > 45 && timeSinceBreak > 30) scores.eye_rest += 30;
        if (energy < 50 && sessionDuration > 30) scores.eye_rest += 15;

        // --- Signal: High error rate → Creative break (mental block) ---
        if (errorRate > 0.15) scores.creative += 35;
        else if (errorRate > 0.08) scores.creative += 20;

        // --- Signal: Low energy + high errors → Mental block ---
        if (energy < 45 && errorRate > 0.1) scores.creative += 20;

        // --- Signal: Afternoon slump → Hydration/Snack ---
        if (hour >= 14 && hour <= 16) scores.hydration += 30;
        if (hour >= 11 && hour <= 12) scores.hydration += 15;
        if (timeSinceBreak > 90) scores.hydration += 20;

        // --- Signal: Long solo session → Social ---
        if (sessionDuration > 120) scores.social += 25;
        if (sessionDuration > 60 && hour >= 12 && hour <= 14) scores.social += 15;

        // Find the top-scoring break type
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const topType = sorted[0][0];
        const topScore = sorted[0][1];

        // If no strong signal, default to movement (always good)
        const breakType = topScore >= 15 ? topType : 'movement';

        const breakDetails = {
            breathing: {
                type: 'breathing',
                emoji: '🧘',
                title: 'Mindfulness Break',
                activity: 'Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Repeat 4 times.',
                duration: 3,
                reason: 'Your stress signals are elevated. A breathing exercise can reset your nervous system.',
            },
            movement: {
                type: 'movement',
                emoji: '🚶',
                title: 'Movement Break',
                activity: 'Stand up, stretch, and walk around for a few minutes. Do some neck rolls and shoulder shrugs.',
                duration: 5,
                reason: 'You\'ve been sitting for a while. Movement improves blood flow and cognitive function.',
            },
            eye_rest: {
                type: 'eye_rest',
                emoji: '👁️',
                title: 'Eye Rest Break',
                activity: 'Follow the 20-20-20 rule: look at something 20 feet away for 20 seconds. Then close your eyes for 30s.',
                duration: 2,
                reason: 'Extended screen time causes eye strain. A short visual break can reduce fatigue.',
            },
            creative: {
                type: 'creative',
                emoji: '🎨',
                title: 'Creative Reset',
                activity: 'Step away and do something different: doodle, listen to a song, or look out the window.',
                duration: 5,
                reason: 'Your error rate suggests a mental block. A change of mental context helps reset problem-solving ability.',
            },
            hydration: {
                type: 'hydration',
                emoji: '🥤',
                title: 'Hydration Break',
                activity: 'Grab a glass of water or a healthy snack. Dehydration reduces cognitive performance by up to 25%.',
                duration: 3,
                reason: 'It\'s been a while since your last break. Staying hydrated maintains peak mental performance.',
            },
            social: {
                type: 'social',
                emoji: '💬',
                title: 'Social Break',
                activity: 'Chat with a colleague, call a friend, or just step into a common area for a brief conversation.',
                duration: 5,
                reason: 'Long solo sessions can lead to tunnel vision. Brief social interaction boosts mood and creativity.',
            },
        };

        const recommendation = breakDetails[breakType];
        recommendation.scores = scores;  // For debugging/logging

        return recommendation;
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

        // Attach break type recommendation for break interventions
        if (data.type === 'break_suggestion' || data.type === 'mandatory_break' || data.type === 'critical_energy') {
            intervention.breakRecommendation = this._recommendBreakType(
                {
                    currentEnergy: data.energyBefore,
                    sessionDuration: data._sessionDuration || 0,
                    timeSinceBreak: data._timeSinceBreak || 0,
                    errorRate: data._errorRate || 0,
                    stressLevel: data._stressLevel || 5,
                },
                null
            );
            // Enhance the message with the recommendation
            const rec = intervention.breakRecommendation;
            intervention.breakType = rec.type;
            intervention.breakEmoji = rec.emoji;
            intervention.breakTitle = rec.title;
            intervention.breakActivity = rec.activity;
            intervention.breakDuration = rec.duration;
            intervention.breakReason = rec.reason;
            console.log(`[InterventionEngine] Break type: ${rec.emoji} ${rec.title} (${rec.reason.substring(0, 50)}...)`);
        }

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

        // Show desktop notification
        try {
            notificationManager.showIntervention(intervention);
        } catch (error) {
            console.error('[InterventionEngine] Error showing notification:', error);
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
