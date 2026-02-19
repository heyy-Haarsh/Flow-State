import { useState, useEffect } from 'react';
import { Coffee, X, Timer, Dumbbell, MessageCircle, Palette, Eye, Droplets, Wind, Sparkles } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { BREAK_TYPES } from '@/utils/constants';

interface BreakRecommendation {
    type: string;
    emoji: string;
    title: string;
    activity: string;
    duration: number;
    reason: string;
}

interface BreakSuggestionProps {
    onDismiss?: () => void;
    recommendation?: BreakRecommendation | null;
}

export default function BreakSuggestion({ onDismiss, recommendation }: BreakSuggestionProps) {
    const [breakActive, setBreakActive] = useState(false);
    const [selectedBreak, setSelectedBreak] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    const breakIcons: Record<string, any> = {
        breathing: Wind,
        movement: Dumbbell,
        eye_rest: Eye,
        creative: Palette,
        hydration: Droplets,
        social: MessageCircle,
    };

    const breakMessages: Record<string, string> = {
        breathing: 'Inhale 4s... Hold 7s... Exhale 8s... 🧘',
        movement: 'Stand up, stretch, and walk around 🚶',
        eye_rest: 'Look at something 20 feet away for 20 seconds 👁️',
        creative: 'Doodle, listen to music, or daydream 🎨',
        hydration: 'Grab a glass of water or a healthy snack 🥤',
        social: 'Chat with a colleague or friend 💬',
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

    // Break Timer Overlay
    if (breakActive) {
        return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-dark-950/90 backdrop-blur-md">
                <div className="text-center">
                    <div className="w-36 h-36 mx-auto rounded-full border-4 border-blue-500/30 flex items-center justify-center mb-6 animate-pulse-slow">
                        <span className="text-4xl font-bold text-blue-400 tabular-nums">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-dark-100 mb-2">Break Time</h2>
                    <p className="text-dark-400 mb-2 text-lg">
                        {selectedBreak && breakMessages[selectedBreak]}
                    </p>
                    {recommendation && selectedBreak === recommendation.type && (
                        <p className="text-dark-500 text-sm mb-6 max-w-sm mx-auto">
                            {recommendation.activity}
                        </p>
                    )}
                    {!(recommendation && selectedBreak === recommendation.type) && (
                        <div className="mb-6" />
                    )}
                    <Button variant="secondary" onClick={() => { setBreakActive(false); onDismiss?.(); }}>
                        End Break Early
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="border-amber-500/20">
            <div className="flex items-start justify-between mb-3">
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

            {/* ML-Recommended Break Type (highlighted) */}
            {recommendation && (
                <div
                    className="mb-3 p-3 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-all"
                    onClick={() => startBreak(recommendation.type, recommendation.duration)}
                >
                    <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles size={14} className="text-amber-400" />
                        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                            AI Recommended
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{recommendation.emoji}</span>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-dark-100">
                                {recommendation.title}
                                <span className="text-dark-500 font-normal ml-2">
                                    {recommendation.duration} min
                                </span>
                            </p>
                            <p className="text-xs text-dark-400 mt-0.5">{recommendation.reason}</p>
                        </div>
                        <Timer size={16} className="text-amber-400" />
                    </div>
                </div>
            )}

            {/* Other Break Options */}
            <div className="grid grid-cols-3 gap-2">
                {BREAK_TYPES
                    .filter(bt => !recommendation || bt.value !== recommendation.type)
                    .map((bt) => {
                        const Icon = breakIcons[bt.value] || Coffee;
                        return (
                            <button
                                key={bt.value}
                                onClick={() => startBreak(bt.value, bt.duration)}
                                className="p-2.5 rounded-xl border border-dark-600 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left"
                            >
                                <Icon size={14} className="text-dark-400 mb-1" />
                                <p className="text-xs text-dark-200">{bt.label.split(' ').slice(1).join(' ')}</p>
                                <p className="text-[10px] text-dark-500">{bt.duration} min</p>
                            </button>
                        );
                    })}
            </div>
        </Card>
    );
}
