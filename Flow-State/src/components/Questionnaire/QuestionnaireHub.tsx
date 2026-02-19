import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import MorningCheckin from './MorningCheckin';
import EndOfDayReflection from './EndOfDayReflection';

export default function QuestionnaireHub() {
    const [type, setType] = useState<'morning' | 'evening'>('morning');
    const hour = new Date().getHours();

    // Auto-suggest based on time
    const suggestedType = hour < 14 ? 'morning' : 'evening';

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-dark-100">Daily Check-in</h2>
                <p className="text-sm text-dark-400 mt-1">
                    Help FlowState learn your patterns with daily self-reports
                </p>
            </div>

            {/* Type Selector */}
            <div className="flex gap-3 max-w-lg mx-auto">
                <button
                    onClick={() => setType('morning')}
                    className={`flex-1 p-4 rounded-xl border transition-all flex items-center gap-3 ${type === 'morning'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'border-dark-600 text-dark-400 hover:border-dark-500'
                        }`}
                >
                    <Sun size={20} />
                    <div className="text-left">
                        <p className="text-sm font-medium">Morning Check-in</p>
                        <p className="text-[10px] opacity-70">How are you starting today?</p>
                    </div>
                    {suggestedType === 'morning' && (
                        <span className="ml-auto text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">
                            Suggested
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setType('evening')}
                    className={`flex-1 p-4 rounded-xl border transition-all flex items-center gap-3 ${type === 'evening'
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'border-dark-600 text-dark-400 hover:border-dark-500'
                        }`}
                >
                    <Moon size={20} />
                    <div className="text-left">
                        <p className="text-sm font-medium">End-of-Day</p>
                        <p className="text-[10px] opacity-70">Reflect on your day</p>
                    </div>
                    {suggestedType === 'evening' && (
                        <span className="ml-auto text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400">
                            Suggested
                        </span>
                    )}
                </button>
            </div>

            {/* Questionnaire */}
            {type === 'morning' ? <MorningCheckin /> : <EndOfDayReflection />}
        </div>
    );
}
