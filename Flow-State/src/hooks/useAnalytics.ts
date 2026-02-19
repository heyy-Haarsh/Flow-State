import { useState, useCallback } from 'react';
import type { HourlyMetric, DailySummary } from '@/types/flowstate';

/**
 * Hook for fetching and managing analytics data.
 */
export function useAnalytics() {
    const [hourlyData, setHourlyData] = useState<HourlyMetric[]>([]);
    const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchHourlyData = useCallback(async (hours: number = 24) => {
        setIsLoading(true);
        try {
            if (window.electron?.getAnalytics) {
                const data = await window.electron.getAnalytics(hours);
                setHourlyData(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch hourly analytics:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchWeeklySummary = useCallback(async () => {
        setIsLoading(true);
        try {
            if (window.electron?.getWeeklySummary) {
                const data = await window.electron.getWeeklySummary();
                setDailySummaries(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch weekly summary:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        hourlyData,
        dailySummaries,
        isLoading,
        fetchHourlyData,
        fetchWeeklySummary,
    };
}
