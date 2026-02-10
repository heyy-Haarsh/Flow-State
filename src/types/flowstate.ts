// ============================================
// FlowState - Core Type Definitions
// ============================================

// ---- Energy & Complexity ----

export type TaskComplexity = 'low' | 'medium' | 'high';
export type EnergyLevel = 'critical' | 'low' | 'good' | 'peak';
export type InterventionPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type BreakType = 'movement' | 'rest' | 'social' | 'creative';
export type QuestionnaireType = 'morning_checkin' | 'end_of_day' | 'weekly';

// ---- Task ----

export interface Task {
    id: string;
    title: string;
    description?: string;
    complexity: TaskComplexity;
    complexityWeight: number; // 2, 5, or 8
    estimatedDuration: number; // minutes
    actualDuration?: number;
    status: TaskStatus;
    completionPercent: number; // 0-100
    createdAt: string;
    completedAt?: string;
}

// ---- Cognitive State (real-time snapshot) ----

export interface CognitiveState {
    energyScore: number; // 0-100
    energyLevel: EnergyLevel;
    workVelocity: number; // 0-1.5
    errorRate: number; // percentage
    typingSpeed: number; // keystrokes per minute
    sessionDuration: number; // minutes since session start
    timeSinceLastBreak: number; // minutes
    burnoutRisk: number; // 0-1
    isInFlowState: boolean;
}

// ---- Activity Metrics (aggregated) ----

export interface ActivityMetrics {
    avgTypingSpeed: number;
    avgErrorRate: number;
    mouseEntropy: number;
    idlePercentage: number;
    tasksCompleted: number;
    workMinutes: number;
    contextSwitches: number;
}

// ---- Baseline (learned over Week 1) ----

export interface UserBaseline {
    typingSpeed: number;
    errorRate: number;
    tasksPerDay: number;
    peakHours: number[]; // e.g., [9, 10, 14, 15]
    energyCurve: Record<number, number>; // hour -> energy multiplier
    lastUpdated: string;
}

// ---- Questionnaire Responses ----

export interface MorningCheckinResponse {
    sleepQuality: number; // 1-10
    currentEnergy: number; // 0-100 (ML TARGET)
    mentalSharpness: number; // 1-10
    stressLevel: number; // 1-10
    exerciseToday: boolean;
    caffeineIntake: number; // 0-3
    expectedWorkHours: number;
    expectedDifficulty: number; // 1-10
    motivationLevel: number; // 1-10
    externalFactors: string[];
    expectedWorkType: string[];
    peakTimePreference: string[];
}

export interface EndOfDayResponse {
    accuracyRating: number; // 1-10
    currentEnergy: number; // 0-100
    hitWallTime?: string; // time or null
    productivityVsExpectation: number; // -50 to 50
    helpfulInterventions: string[];
    focusDerailments: string[];
    breaksTaken: number;
    breaksHelpfulness: number; // 1-10
}

export interface QuestionnaireResponse {
    id?: number;
    timestamp: string;
    questionnaireType: QuestionnaireType;
    dayNumber: number; // 1-7 for calibration
    morning?: MorningCheckinResponse;
    endOfDay?: EndOfDayResponse;
}

// ---- Intervention ----

export interface Intervention {
    id: string;
    timestamp: string;
    type: string;
    message: string;
    priority: InterventionPriority;
    suggestedAction?: string;
    accepted?: boolean;
    energyBefore: number;
    energyAfter?: number;
}

// ---- Break ----

export interface Break {
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number; // minutes
    breakType: BreakType;
    energyBefore: number;
    energyAfter?: number;
}

// ---- Analytics ----

export interface HourlyMetric {
    hourStart: string;
    avgTypingSpeed: number;
    avgErrorRate: number;
    mouseEntropy: number;
    idlePercentage: number;
    tasksCompleted: number;
    avgEnergyScore: number;
    workMinutes: number;
}

export interface DailySummary {
    date: string;
    avgEnergy: number;
    tasksCompleted: number;
    workHours: number;
    peakHours: number[];
    burnoutScore: number;
}

// ---- Settings ----

export interface UserSettings {
    dataRetentionDays: number;
    monitoringEnabled: boolean;
    breakReminderEnabled: boolean;
    calibrationDay: number; // 0 = not started, 1-7 = in progress, 8+ = done
    modelTrained: boolean;
    theme: 'dark' | 'light';
}

// ---- ML Features (input to the model) ----

export interface MLFeatures {
    typingSpeed5min: number;
    typingSpeed15min: number;
    errorRate5min: number;
    errorRate15min: number;
    mouseEntropy: number;
    idlePercentage: number;
    sessionDuration: number;
    timeSinceBreak: number;
    tasksCompletedHour: number;
    hourOfDay: number;
    dayOfWeek: number;
    sleepQuality: number;
    stressLevel: number;
    caffeineIntake: number;
    exerciseToday: number; // 0 or 1
    expectedDifficulty: number;
    typingSpeedRatio: number;
    errorRateRatio: number;
}

// ---- Store State ----

export interface FlowStateStore {
    // Cognitive state
    cognitiveState: CognitiveState;

    // Activity tracking (raw counters)
    keystrokeTimestamps: number[];
    backspaceCount: number;
    totalKeystrokes: number;
    contextSwitchCount: number;
    isIdle: boolean;
    sessionStartTime: number;
    lastBreakTime: number;

    // Baseline
    baseline: UserBaseline | null;

    // Tasks
    tasks: Task[];

    // Settings
    settings: UserSettings;
    calibrationDay: number;

    // Actions
    recordKeystroke: (isBackspace: boolean) => void;
    recordContextSwitch: () => void;
    recordIdle: (idle: boolean) => void;
    updateMetrics: () => void;
    setBaseline: (baseline: UserBaseline) => void;

    // Task actions
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'complexityWeight' | 'completionPercent'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    startTask: (id: string) => void;
    completeTask: (id: string) => void;
}
