import { useEffect, useState } from 'react';
import { useFlowStateStore } from '@/stores/flowstate-store';
import type { CognitiveState } from '@/types/flowstate';

/**
 * Hook for accessing real-time energy data and updates.
 * Listens for energy updates from the Electron main process (when available)
 * and falls back to the Zustand store's computed energy.
 */
export function useEnergy() {
    const cognitiveState = useFlowStateStore((state) => state.cognitiveState);
    const [mlEnergy, setMlEnergy] = useState<number | null>(null);

    useEffect(() => {
        // Listen for ML-powered energy updates from Electron main process
        if (window.electron?.onEnergyUpdate) {
            window.electron.onEnergyUpdate((score: number) => {
                setMlEnergy(score);
            });
        }
    }, []);

    // Use ML energy if available, otherwise use rule-based
    const energyScore = mlEnergy ?? cognitiveState.energyScore;

    return {
        energyScore,
        energyLevel: cognitiveState.energyLevel,
        isMLPowered: mlEnergy !== null,
        cognitiveState,
        typingSpeed: cognitiveState.typingSpeed,
        errorRate: cognitiveState.errorRate,
        sessionDuration: cognitiveState.sessionDuration,
        burnoutRisk: cognitiveState.burnoutRisk,
        isInFlowState: cognitiveState.isInFlowState,
    };
}
