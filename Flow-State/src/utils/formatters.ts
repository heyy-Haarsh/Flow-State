/**
 * FlowState - Formatting Utilities
 */

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

// ---- Time Formatting ----

export function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

export function formatTimestamp(timestamp: string | Date): string {
    const date = new Date(timestamp);
    if (isToday(date)) return `Today ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
}

export function formatTimeAgo(timestamp: string | Date): string {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

// ---- Number Formatting ----

export function formatPercent(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
}

export function formatEnergyScore(score: number): string {
    return `${Math.round(score)}`;
}

// ---- Energy Level Labels ----

export function getEnergyLabel(score: number): string {
    if (score >= 80) return 'Peak Energy';
    if (score >= 60) return 'Good Energy';
    if (score >= 40) return 'Low Energy';
    return 'Critical';
}

export function getEnergyEmoji(score: number): string {
    if (score >= 80) return '⚡';
    if (score >= 60) return '✅';
    if (score >= 40) return '⚠️';
    return '🔴';
}

// ---- Complexity Labels ----

export function getComplexityLabel(complexity: string): string {
    return complexity.charAt(0).toUpperCase() + complexity.slice(1);
}

export function getComplexityColor(complexity: string): string {
    switch (complexity) {
        case 'high': return '#EF4444';
        case 'medium': return '#F59E0B';
        case 'low': return '#10B981';
        default: return '#6B7280';
    }
}
