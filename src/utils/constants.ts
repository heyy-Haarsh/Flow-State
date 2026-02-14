/**
 * FlowState - Application Constants
 */

// ---- Energy Colors ----
export const ENERGY_COLORS = {
    critical: '#EF4444',  // 0-40: Red
    low: '#F59E0B',       // 40-60: Orange
    good: '#10B981',      // 60-80: Green
    peak: '#3B82F6',      // 80-100: Blue
} as const;

export function getEnergyColor(score: number): string {
    if (score >= 80) return ENERGY_COLORS.peak;
    if (score >= 60) return ENERGY_COLORS.good;
    if (score >= 40) return ENERGY_COLORS.low;
    return ENERGY_COLORS.critical;
}

// ---- Complexity ----
export const COMPLEXITY_OPTIONS = [
    { value: 'low', label: 'Low', color: '#10B981', weight: 2 },
    { value: 'medium', label: 'Medium', color: '#F59E0B', weight: 5 },
    { value: 'high', label: 'High', color: '#EF4444', weight: 8 },
] as const;

// ---- Questionnaire ----
export const CALIBRATION_DAYS = 7;

export const EXTERNAL_FACTORS = [
    'Headache',
    'Feeling sick',
    'Hungry',
    'Distracted',
    'Deadline pressure',
    'Personal issues',
    'None',
] as const;

export const WORK_TYPES = [
    'Deep focus work',
    'Meetings',
    'Administrative tasks',
    'Creative work',
    'Mixed',
] as const;

export const PEAK_TIME_OPTIONS = [
    'Early morning (6-9 AM)',
    'Mid-morning (9-12 PM)',
    'Afternoon (12-3 PM)',
    'Late afternoon (3-6 PM)',
    'Evening (6+ PM)',
] as const;

// ---- Break Types ----
export const BREAK_TYPES = [
    { value: 'movement', label: '🏃 Movement Break', duration: 5 },
    { value: 'rest', label: '😴 Rest Break', duration: 10 },
    { value: 'social', label: '💬 Social Break', duration: 10 },
    { value: 'creative', label: '🎨 Creative Break', duration: 15 },
] as const;

// ---- Data Retention ----
export const RETENTION_OPTIONS = [
    { label: '7 days (Maximum Privacy)', value: 7 },
    { label: '30 days (Recommended)', value: 30 },
    { label: '90 days (More Analytics)', value: 90 },
    { label: 'Keep Forever', value: 0 },
] as const;

// ---- Navigation ----
export const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { id: 'focus', label: 'Focus', icon: 'Timer' },
    { id: 'tasks', label: 'Tasks', icon: 'CheckSquare' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
    { id: 'questionnaire', label: 'Check-in', icon: 'ClipboardList' },
    { id: 'privacy', label: 'Privacy', icon: 'Shield' },
    { id: 'settings', label: 'Settings', icon: 'Settings' },
] as const;

// ---- Timing ----
export const METRICS_UPDATE_INTERVAL = 30000;    // 30 seconds
export const ENERGY_UPDATE_INTERVAL = 300000;     // 5 minutes
export const AGGREGATION_INTERVAL = 3600000;      // 1 hour
export const INTERVENTION_COOLDOWN = 900000;      // 15 minutes
