import { useState, useEffect } from 'react';
import { Coffee, X, Timer, Dumbbell, MessageCircle, Palette } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { BREAK_TYPES } from '@/utils/constants';

export default function BreakSuggestion({ onDismiss }: { onDismiss?: () => void }) {
    const [breakActive, setBreakActive] = useState(false);
    const [selectedBreak, setSelectedBreak] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    const breakIcons: Record<string, any> = {
        movement: Dumbbell,
        rest: Coffee,
        social: MessageCircle,
        creative: Palette,
    };

    useEffect(() => {
        if (!breakActive || timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    setBreakActive(false);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [breakActive, timeLeft]);

    const startBreak = (type: string, duration: number) => {
        setSelectedBreak(type);
        setBreakActive(true);
        setTimeLeft(duration * 60);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (breakActive) {
        return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-dark-950/90 backdrop-blur-md">
                <div className="text-center">
                    <div className="w-32 h-32 mx-auto rounded-full border-4 border-blue-500/30 flex items-center justify-center mb-6 animate-pulse-slow">
                        <span className="text-4xl font-bold text-blue-400 tabular-nums">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-dark-100 mb-2">Break Time</h2>
                    <p className="text-dark-400 mb-8">
                        {selectedBreak === 'movement' && 'Stand up, stretch, or walk around 🏃'}
                        {selectedBreak === 'rest' && 'Close your eyes and breathe deeply 😴'}
                        {selectedBreak === 'social' && 'Chat with a colleague or friend 💬'}
                        {selectedBreak === 'creative' && 'Doodle, listen to music, or daydream 🎨'}
                    </p>
                    <Button variant="secondary" onClick={() => { setBreakActive(false); onDismiss?.(); }}>
                        End Break Early
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="border-amber-500/20">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/15">
                        <Coffee size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-dark-100">Time for a Break</h3>
                        <p className="text-xs text-dark-400">Your energy is dipping. A short break will help.</p>
                    </div>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {BREAK_TYPES.map((bt) => {
                    const Icon = breakIcons[bt.value] || Coffee;
                    return (
                        <button
                            key={bt.value}
                            onClick={() => startBreak(bt.value, bt.duration)}
                            className="p-3 rounded-xl border border-dark-600 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left"
                        >
                            <Icon size={16} className="text-amber-400 mb-1" />
                            <p className="text-sm text-dark-200">{bt.label.split(' ').slice(1).join(' ')}</p>
                            <p className="text-[10px] text-dark-500">{bt.duration} min</p>
                        </button>
                    );
                })}
            </div>
        </Card>
    );
}
