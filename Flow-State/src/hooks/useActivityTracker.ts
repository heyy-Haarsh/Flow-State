import { useEffect, useRef } from 'react';
import { useFlowStateStore } from '@/stores/flowstate-store';

/**
 * Hook that tracks user activity: keyboard events, visibility changes,
 * and context switches. Runs metric updates every 30 seconds.
 */
export function useActivityTracker() {
    const { recordKeystroke, recordContextSwitch, recordIdle, updateMetrics } = useFlowStateStore();
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    useEffect(() => {
        // Keyboard tracking
        const handleKeyDown = (e: KeyboardEvent) => {
            const isBackspace = e.key === 'Backspace' || e.key === 'Delete';
            recordKeystroke(isBackspace);
        };

        // Visibility / tab switch tracking
        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordContextSwitch();
                recordIdle(true);
            } else {
                recordIdle(false);
            }
        };

        // Window blur/focus
        const handleBlur = () => {
            recordContextSwitch();
            recordIdle(true);
        };
        const handleFocus = () => {
            recordIdle(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        // Update metrics every 30s
        intervalRef.current = setInterval(() => {
            updateMetrics();
        }, 30000);

        // Initial update
        updateMetrics();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [recordKeystroke, recordContextSwitch, recordIdle, updateMetrics]);
}
