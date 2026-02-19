import { useState } from 'react';
import { Sun, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';

interface MorningCheckinProps {
    onComplete?: () => void;
}

const STEPS = [
    { key: 'sleep_quality', label: 'How did you sleep last night?', min: 1, max: 10, labels: ['Terrible', 'Amazing'] },
    { key: 'current_energy', label: 'How energized do you feel right now?', min: 1, max: 10, labels: ['Exhausted', 'Fully charged'] },
    { key: 'stress_level', label: 'What is your current stress level?', min: 1, max: 10, labels: ['Calm', 'Very stressed'] },
    {
        key: 'caffeine_intake', label: 'Caffeine intake today?', type: 'select', options: [
            { value: 0, label: 'None' },
            { value: 1, label: '1 cup' },
            { value: 2, label: '2 cups' },
            { value: 3, label: '3+ cups' },
        ]
    },
    { key: 'exercise_today', label: 'Did you exercise today?', type: 'boolean' },
    { key: 'expected_difficulty', label: 'How difficult do you expect today to be?', min: 1, max: 10, labels: ['Easy day', 'Very challenging'] },
];

export default function MorningCheckin({ onComplete }: MorningCheckinProps) {
    const [step, setStep] = useState(0);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [submitted, setSubmitted] = useState(false);

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const canNext = responses[current?.key] != null;

    const setResponse = (value: any) => {
        setResponses((prev) => ({ ...prev, [current.key]: value }));
    };

    const handleSubmit = () => {
        setSubmitted(true);
        // Save to Electron if available
        if (window.electron?.saveQuestionnaire) {
            window.electron.saveQuestionnaire({
                questionnaire_type: 'morning_checkin',
                ...responses,
            });
        }
        onComplete?.();
    };

    if (submitted) {
        return (
            <Card className="max-w-lg mx-auto text-center py-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/15 flex items-center justify-center mb-4">
                    <Check size={28} className="text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-dark-100">Check-in Complete!</h3>
                <p className="text-dark-400 text-sm mt-2">
                    Your responses help personalize your energy predictions. Great start to the day! ☀️
                </p>
                <Button className="mt-6" onClick={() => { setSubmitted(false); setStep(0); setResponses({}); }}>
                    Redo Check-in
                </Button>
            </Card>
        );
    }

    return (
        <div className="max-w-lg mx-auto">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
                {STEPS.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-blue-500' : 'bg-dark-700'
                            }`}
                    />
                ))}
            </div>

            <Card className="py-8 px-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-amber-500/15">
                        <Sun size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-dark-100">Morning Check-in</h3>
                        <p className="text-xs text-dark-500">Step {step + 1} of {STEPS.length}</p>
                    </div>
                </div>

                {/* Question */}
                <h4 className="text-lg font-medium text-dark-100 mb-6">{current.label}</h4>

                {/* Input */}
                {current.type === 'select' ? (
                    <div className="grid grid-cols-2 gap-2">
                        {current.options!.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setResponse(opt.value)}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${responses[current.key] === opt.value
                                        ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                                        : 'border-dark-600 text-dark-400 hover:border-dark-500 hover:bg-dark-800/50'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ) : current.type === 'boolean' ? (
                    <div className="flex gap-3">
                        {[
                            { value: true, label: 'Yes 💪', desc: 'I exercised' },
                            { value: false, label: 'No', desc: 'Not yet' },
                        ].map((opt) => (
                            <button
                                key={String(opt.value)}
                                onClick={() => setResponse(opt.value)}
                                className={`flex-1 p-4 rounded-xl border text-center transition-all ${responses[current.key] === opt.value
                                        ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                                        : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                    }`}
                            >
                                <span className="text-lg font-medium block">{opt.label}</span>
                                <span className="text-xs mt-1 block opacity-70">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* Slider */
                    <div>
                        <div className="flex items-center justify-center mb-4">
                            <span
                                className="text-5xl font-bold tabular-nums"
                                style={{
                                    color: current.key === 'stress_level'
                                        ? `hsl(${120 - ((responses[current.key] || 5) - 1) * 12}, 70%, 60%)`
                                        : `hsl(${((responses[current.key] || 5) - 1) * 12}, 70%, 60%)`,
                                }}
                            >
                                {responses[current.key] || 5}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={current.min}
                            max={current.max}
                            value={responses[current.key] || 5}
                            onChange={(e) => setResponse(Number(e.target.value))}
                            className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-dark-500">{current.labels![0]}</span>
                            <span className="text-xs text-dark-500">{current.labels![1]}</span>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <Button
                        variant="ghost"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                        icon={<ChevronLeft size={16} />}
                    >
                        Back
                    </Button>

                    {isLast ? (
                        <Button onClick={handleSubmit} disabled={!canNext} icon={<Check size={16} />}>
                            Submit
                        </Button>
                    ) : (
                        <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                            Next <ChevronRight size={16} />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
