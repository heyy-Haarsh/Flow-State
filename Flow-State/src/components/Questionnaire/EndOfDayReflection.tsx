import { useState } from 'react';
import { Moon, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { EXTERNAL_FACTORS, WORK_TYPES } from '@/utils/constants';

interface EndOfDayReflectionProps {
    onComplete?: () => void;
}

const STEPS = [
    { key: 'perceived_productivity', label: 'How productive did you feel today?', min: 1, max: 10, labels: ['Not at all', 'Extremely'] },
    { key: 'end_energy', label: 'How is your energy right now?', min: 1, max: 10, labels: ['Exhausted', 'Still going'] },
    { key: 'work_type', label: 'What type of work dominated today?', type: 'select', options: WORK_TYPES },
    { key: 'external_factors', label: 'Any external factors affected your day?', type: 'multi-select', options: EXTERNAL_FACTORS },
    { key: 'highlight', label: "What's one accomplishment from today?", type: 'text' },
];

export default function EndOfDayReflection({ onComplete }: EndOfDayReflectionProps) {
    const [step, setStep] = useState(0);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [submitted, setSubmitted] = useState(false);

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    const setResponse = (value: any) => {
        setResponses((prev) => ({ ...prev, [current.key]: value }));
    };

    const toggleMulti = (value: string) => {
        const arr: string[] = responses[current.key] || [];
        if (arr.includes(value)) {
            setResponse(arr.filter((v) => v !== value));
        } else {
            setResponse([...arr, value]);
        }
    };

    const handleSubmit = () => {
        setSubmitted(true);
        if (window.electron?.saveQuestionnaire) {
            window.electron.saveQuestionnaire({
                questionnaire_type: 'end_of_day',
                ...responses,
            });
        }
        onComplete?.();
    };

    if (submitted) {
        return (
            <Card className="max-w-lg mx-auto text-center py-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/15 flex items-center justify-center mb-4">
                    <Moon size={28} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-dark-100">Reflection Saved!</h3>
                <p className="text-dark-400 text-sm mt-2">
                    Great work today. Your data helps improve tomorrow's predictions. Rest well! 🌙
                </p>
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
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-indigo-500' : 'bg-dark-700'
                            }`}
                    />
                ))}
            </div>

            <Card className="py-8 px-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-indigo-500/15">
                        <Moon size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-dark-100">End-of-Day Reflection</h3>
                        <p className="text-xs text-dark-500">Step {step + 1} of {STEPS.length}</p>
                    </div>
                </div>

                <h4 className="text-lg font-medium text-dark-100 mb-6">{current.label}</h4>

                {current.type === 'select' ? (
                    <div className="space-y-2">
                        {(current.options as readonly string[]).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setResponse(opt)}
                                className={`w-full p-3 rounded-xl border text-sm text-left transition-all ${responses[current.key] === opt
                                        ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400'
                                        : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                ) : current.type === 'multi-select' ? (
                    <div className="flex flex-wrap gap-2">
                        {(current.options as readonly string[]).map((opt) => {
                            const selected = (responses[current.key] || []).includes(opt);
                            return (
                                <button
                                    key={opt}
                                    onClick={() => toggleMulti(opt)}
                                    className={`px-3 py-2 rounded-xl border text-sm transition-all ${selected
                                            ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400'
                                            : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                        }`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                ) : current.type === 'text' ? (
                    <textarea
                        value={responses[current.key] || ''}
                        onChange={(e) => setResponse(e.target.value)}
                        className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                        rows={3}
                        placeholder="Type your highlight..."
                    />
                ) : (
                    <div>
                        <div className="flex items-center justify-center mb-4">
                            <span className="text-5xl font-bold tabular-nums text-indigo-400">
                                {responses[current.key] || 5}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={current.min}
                            max={current.max}
                            value={responses[current.key] || 5}
                            onChange={(e) => setResponse(Number(e.target.value))}
                            className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-dark-500">{current.labels![0]}</span>
                            <span className="text-xs text-dark-500">{current.labels![1]}</span>
                        </div>
                    </div>
                )}

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
                        <Button onClick={handleSubmit} icon={<Check size={16} />}>Submit</Button>
                    ) : (
                        <Button onClick={() => setStep((s) => s + 1)}>
                            Next <ChevronRight size={16} />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
