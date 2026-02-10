// ============================================
// FlowState - Core Zustand Store
// ============================================
// Central state management for cognitive state,
// activity tracking, tasks, and settings
// ============================================

import { create } from 'zustand';
import type { FlowStateStore, Task, UserBaseline, CognitiveState } from '@/types/flowstate';
import {
    calculateEnergyScore,
    calculateErrorRate,
    calculateTypingSpeed,
    calculateWorkVelocity,
    getEnergyLevel,
    getComplexityWeight,
} from '@/utils/metrics';

const DEFAULT_BASELINE: UserBaseline = {
    typingSpeed: 50, // 50 keystrokes per minute
    errorRate: 5, // 5% error rate
    tasksPerDay: 6,
    peakHours: [9, 10, 14, 15],
    energyCurve: {},
    lastUpdated: new Date().toISOString(),
};

const DEFAULT_COGNITIVE_STATE: CognitiveState = {
    energyScore: 70,
    energyLevel: 'good',
    workVelocity: 0,
    errorRate: 0,
    typingSpeed: 0,
    sessionDuration: 0,
    timeSinceLastBreak: 0,
    burnoutRisk: 0,
    isInFlowState: false,
};

export const useFlowStateStore = create<FlowStateStore>((set, get) => ({
    // ---- Cognitive State ----
    cognitiveState: { ...DEFAULT_COGNITIVE_STATE },

    // ---- Raw Tracking Counters ----
    keystrokeTimestamps: [],
    backspaceCount: 0,
    totalKeystrokes: 0,
    contextSwitchCount: 0,
    isIdle: false,
    sessionStartTime: Date.now(),
    lastBreakTime: Date.now(),

    // ---- Baseline ----
    baseline: DEFAULT_BASELINE,

    // ---- Tasks ----
    tasks: [],

    // ---- Settings ----
    settings: {
        dataRetentionDays: 30,
        monitoringEnabled: true,
        breakReminderEnabled: true,
        calibrationDay: 0,
        modelTrained: false,
        theme: 'dark',
    },
    calibrationDay: 0,

    // ============ ACTIONS ============

    recordKeystroke: (isBackspace: boolean) => {
        set((state) => {
            const now = Date.now();
            // Keep only last 5 minutes of timestamps (300,000 ms)
            const recentTimestamps = [
                ...state.keystrokeTimestamps.filter((t) => now - t < 300000),
                now,
            ];

            return {
                keystrokeTimestamps: recentTimestamps,
                totalKeystrokes: state.totalKeystrokes + 1,
                backspaceCount: isBackspace
                    ? state.backspaceCount + 1
                    : state.backspaceCount,
            };
        });
    },

    recordContextSwitch: () => {
        set((state) => ({
            contextSwitchCount: state.contextSwitchCount + 1,
        }));
    },

    recordIdle: (idle: boolean) => {
        set({ isIdle: idle });
    },

    updateMetrics: () => {
        const state = get();
        const now = Date.now();
        const baseline = state.baseline || DEFAULT_BASELINE;

        // Calculate session duration in minutes
        const sessionMinutes = (now - state.sessionStartTime) / 60000;
        const timeSinceBreak = (now - state.lastBreakTime) / 60000;

        // Typing speed (keystrokes per minute over last 60s)
        const typingSpeed = calculateTypingSpeed(state.keystrokeTimestamps, 60000);

        // Error rate
        const errorRate = calculateErrorRate(
            state.backspaceCount,
            0, // No validation fails tracked in browser
            state.totalKeystrokes
        );

        // Tasks completed this hour
        const oneHourAgo = new Date(now - 3600000).toISOString();
        const tasksCompletedThisHour = state.tasks.filter(
            (t) => t.status === 'completed' && t.completedAt && t.completedAt > oneHourAgo
        ).length;

        // Energy score
        const energyScore = calculateEnergyScore({
            currentTypingSpeed: typingSpeed,
            baselineTypingSpeed: baseline.typingSpeed,
            currentErrorRate: errorRate,
            baselineErrorRate: baseline.errorRate,
            tasksCompletedThisHour,
            currentHour: new Date().getHours(),
            sessionMinutes,
        });

        // Work velocity
        const activeTasks = state.tasks.filter((t) => t.status !== 'completed');
        const workVelocity = calculateWorkVelocity(
            activeTasks,
            sessionMinutes,
            state.isIdle ? sessionMinutes * 0.3 : 0
        );

        // Flow state detection
        const isInFlowState = workVelocity > 0.9 && errorRate < 2;

        const cognitiveState: CognitiveState = {
            energyScore,
            energyLevel: getEnergyLevel(energyScore),
            workVelocity,
            errorRate,
            typingSpeed,
            sessionDuration: Math.round(sessionMinutes),
            timeSinceLastBreak: Math.round(timeSinceBreak),
            burnoutRisk: 0, // Calculated separately with historical data
            isInFlowState,
        };

        set({ cognitiveState });
    },

    setBaseline: (baseline: UserBaseline) => {
        set({ baseline });
    },

    // ---- Task Actions ----

    addTask: (taskInput) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title: taskInput.title,
            description: taskInput.description,
            complexity: taskInput.complexity,
            complexityWeight: getComplexityWeight(taskInput.complexity),
            estimatedDuration: taskInput.estimatedDuration,
            status: taskInput.status || 'pending',
            completionPercent: 0,
            createdAt: new Date().toISOString(),
        };

        set((state) => ({
            tasks: [...state.tasks, newTask],
        }));
    },

    updateTask: (id: string, updates: Partial<Task>) => {
        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
    },

    deleteTask: (id: string) => {
        set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
        }));
    },

    startTask: (id: string) => {
        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, status: 'in_progress' as const } : t
            ),
        }));
    },

    completeTask: (id: string) => {
        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === id
                    ? {
                        ...t,
                        status: 'completed' as const,
                        completionPercent: 100,
                        completedAt: new Date().toISOString(),
                    }
                    : t
            ),
        }));
    },
}));
