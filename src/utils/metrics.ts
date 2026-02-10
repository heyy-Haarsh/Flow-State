// ============================================
// FlowState Metric Calculation Engine
// ============================================
// Implements: Work Velocity, Error Rate, Energy Score,
// Burnout Risk, Session Fatigue Penalty, Intervention Logic
// ============================================

import type { TaskComplexity, EnergyLevel, InterventionPriority, Task, CognitiveState } from '@/types/flowstate';

// ---- Constants ----
const COMPLEXITY_WEIGHTS: Record<TaskComplexity, number> = {
    low: 2,
    medium: 5,
    high: 8,
};

// ---- Session Fatigue Penalty ----
export function getSessionFatiguePenalty(sessionMinutes: number): number {
    if (sessionMinutes <= 60) return 1.0;
    if (sessionMinutes <= 90) return 0.95;
    if (sessionMinutes <= 120) return 0.85;
    return 0.75;
}

// ---- Time of Day Multiplier ----
// Based on circadian rhythm research; peaks at 10am and 3pm
export function getTimeOfDayMultiplier(hour: number): number {
    const curve = [
        0.3, 0.2, 0.15, 0.15, 0.2, 0.35, // 0-5
        0.5, 0.65, 0.8, 0.9, 1.0, 0.95,   // 6-11
        0.8, 0.7, 0.75, 0.9, 0.85, 0.75,  // 12-17
        0.6, 0.5, 0.45, 0.4, 0.35, 0.3,   // 18-23
    ];
    return curve[hour] ?? 0.5;
}

// ---- Work Velocity ----
// V_w = Σ(TaskComplexityWeight × Completion%) / (TimeSpent + IdlePenalty)
export function calculateWorkVelocity(
    tasks: Task[],
    timeSpentMinutes: number,
    idleMinutes: number
): number {
    if (timeSpentMinutes === 0) return 0;
    const weightedProgress = tasks.reduce((sum, t) => {
        return sum + (t.complexityWeight * (t.completionPercent / 100));
    }, 0);
    const denominator = timeSpentMinutes + idleMinutes * 0.5;
    const raw = weightedProgress / denominator;
    return Math.min(Math.max(raw, 0), 1.5); // clamp 0-1.5
}

// ---- Error Rate ----
// E_r = (Backspaces + ValidationFails) / TotalKeyInteractions × 100
export function calculateErrorRate(
    backspaces: number,
    validationFails: number,
    totalKeystrokes: number
): number {
    if (totalKeystrokes === 0) return 0;
    return ((backspaces + validationFails) / totalKeystrokes) * 100;
}

// ---- Energy Score (0-100) ----
// Composite: (TS_Ratio × 30) + ((1 - ER_Ratio) × 25) + (TC × 20) + (TOD × 25) × SFP
export function calculateEnergyScore(params: {
    currentTypingSpeed: number;
    baselineTypingSpeed: number;
    currentErrorRate: number;
    baselineErrorRate: number;
    tasksCompletedThisHour: number;
    currentHour: number;
    sessionMinutes: number;
}): number {
    const {
        currentTypingSpeed, baselineTypingSpeed,
        currentErrorRate, baselineErrorRate,
        tasksCompletedThisHour, currentHour, sessionMinutes
    } = params;

    const tsRatio = baselineTypingSpeed > 0
        ? Math.min(currentTypingSpeed / baselineTypingSpeed, 1.2)
        : 0.5;

    const erRatio = baselineErrorRate > 0
        ? Math.min(currentErrorRate / baselineErrorRate, 3)
        : currentErrorRate / 10;

    const tcScore = Math.min(tasksCompletedThisHour / 3, 1); // normalize: 3 tasks/hr = 1.0
    const todMultiplier = getTimeOfDayMultiplier(currentHour);
    const sfp = getSessionFatiguePenalty(sessionMinutes);

    const raw = (
        (tsRatio * 30) +
        ((1 - Math.min(erRatio, 1)) * 25) +
        (tcScore * 20) +
        (todMultiplier * 25)
    ) * sfp;

    return Math.round(Math.min(Math.max(raw, 0), 100));
}

// ---- Energy Level from Score ----
export function getEnergyLevel(score: number): EnergyLevel {
    if (score >= 80) return 'peak';
    if (score >= 60) return 'good';
    if (score >= 40) return 'low';
    return 'critical';
}

// ---- Burnout Risk (0-1) ----
export function calculateBurnoutRisk(params: {
    velocityTrend: number; // negative = declining, 0-1
    recoveryDeficit: number; // 0-1, how much break deficit
    overworkHours: number; // hours worked today
    energyVariance: number; // stddev of recent energy readings
}): number {
    const { velocityTrend, recoveryDeficit, overworkHours, energyVariance } = params;

    const velocityScore = Math.max(0, Math.min(1 - velocityTrend, 1));
    const recoveryScore = Math.min(recoveryDeficit, 1);
    const overworkScore = Math.min(overworkHours / 10, 1);
    const varianceScore = Math.min(energyVariance / 30, 1);

    return (velocityScore + recoveryScore + overworkScore + varianceScore) / 4;
}

// ---- Intervention Decision Engine ----
export interface InterventionDecision {
    shouldIntervene: boolean;
    type: string;
    message: string;
    priority: InterventionPriority;
    suggestedAction?: string;
}

export function evaluateInterventions(state: CognitiveState, tasks: Task[]): InterventionDecision | null {
    // Priority 1: Long session without break
    if (state.sessionDuration > 90 && state.timeSinceLastBreak > 60) {
        return {
            shouldIntervene: true,
            type: 'long_session',
            message: "You've been working for over 90 minutes. A 5-minute break can boost focus by 20%.",
            priority: 'HIGH',
            suggestedAction: 'take_break',
        };
    }

    // Priority 2: High error rate
    if (state.errorRate > 15) {
        const easyTask = tasks.find(t => t.complexity === 'low' && t.status === 'pending');
        return {
            shouldIntervene: true,
            type: 'high_errors',
            message: `Error rate at ${state.errorRate.toFixed(1)}%. Switch to a lighter task to recover.`,
            priority: 'MEDIUM',
            suggestedAction: easyTask ? `switch_to:${easyTask.id}` : 'take_break',
        };
    }

    // Priority 3: Low energy with easy tasks available
    if (state.energyScore < 60) {
        const easyTask = tasks.find(t => t.complexity === 'low' && t.status === 'pending');
        if (easyTask) {
            return {
                shouldIntervene: true,
                type: 'low_energy',
                message: `Energy at ${state.energyScore}%. Try "${easyTask.title}" instead.`,
                priority: 'MEDIUM',
                suggestedAction: `switch_to:${easyTask.id}`,
            };
        }
    }

    // Priority 4: Stuck (idle + incomplete task)
    if (state.timeSinceLastBreak > 15) {
        const activeTask = tasks.find(t => t.status === 'in_progress');
        if (activeTask && activeTask.completionPercent < 50) {
            return {
                shouldIntervene: true,
                type: 'stuck_pattern',
                message: "Looks like you're stuck. A 5-minute movement break can reset your focus.",
                priority: 'MEDIUM',
                suggestedAction: 'movement_break',
            };
        }
    }

    // Flow state detection
    if (state.workVelocity > 0.9 && state.errorRate < 2) {
        return {
            shouldIntervene: true,
            type: 'flow_state',
            message: "You're in the zone! 🔥 Do Not Disturb enabled.",
            priority: 'LOW',
            suggestedAction: 'enable_dnd',
        };
    }

    return null;
}

// ---- Typing Speed (keystrokes per minute) ----
export function calculateTypingSpeed(keystrokeTimestamps: number[], windowMs: number = 60000): number {
    const now = Date.now();
    const recent = keystrokeTimestamps.filter(t => now - t < windowMs);
    if (recent.length < 2) return 0;
    const elapsed = (now - recent[0]) / 60000; // in minutes
    return elapsed > 0 ? Math.round(recent.length / elapsed) : 0;
}

// ---- Peak Hours Analysis ----
export function analyzePeakHours(hourlyData: { hour: number; velocity: number }[]): number[] {
    const avgByHour: Record<number, number[]> = {};
    for (const d of hourlyData) {
        if (!avgByHour[d.hour]) avgByHour[d.hour] = [];
        avgByHour[d.hour].push(d.velocity);
    }

    const hourAvgs = Object.entries(avgByHour).map(([hour, vals]) => ({
        hour: parseInt(hour),
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));

    hourAvgs.sort((a, b) => b.avg - a.avg);
    return hourAvgs.slice(0, 3).map(h => h.hour);
}

// ---- Complexity Weight Getter ----
export function getComplexityWeight(complexity: TaskComplexity): number {
    return COMPLEXITY_WEIGHTS[complexity];
}
