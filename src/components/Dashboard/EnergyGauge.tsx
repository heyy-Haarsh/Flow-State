import { useFlowStateStore } from '@/stores/flowstate-store';
import { getEnergyColor } from '@/utils/constants';

export default function EnergyGauge() {
    const { energyScore, energyLevel } = useFlowStateStore((s) => s.cognitiveState);
    const color = getEnergyColor(energyScore);

    const circumference = 2 * Math.PI * 54; // radius=54
    const progress = (energyScore / 100) * circumference;
    const dashOffset = circumference - progress;

    const labels: Record<string, string> = {
        peak: 'Peak Performance',
        good: 'Good Energy',
        low: 'Low Energy',
        critical: 'Critical — Take a Break',
    };

    return (
        <div className="flex flex-col items-center">
            {/* Circular Gauge */}
            <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    {/* Background track */}
                    <circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="currentColor"
                        className="text-dark-700/40"
                        strokeWidth="8"
                    />
                    {/* Progress arc */}
                    <circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-1000 ease-out"
                        style={{
                            filter: `drop-shadow(0 0 8px ${color}60)`,
                        }}
                    />
                </svg>

                {/* Center number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        className="text-4xl font-bold tabular-nums"
                        style={{ color }}
                    >
                        {Math.round(energyScore)}
                    </span>
                    <span className="text-[10px] text-dark-400 uppercase tracking-wider mt-0.5">
                        Energy
                    </span>
                </div>
            </div>

            {/* Label */}
            <p className="mt-3 text-sm font-medium" style={{ color }}>
                {labels[energyLevel] || 'Calculating...'}
            </p>
        </div>
    );
}
