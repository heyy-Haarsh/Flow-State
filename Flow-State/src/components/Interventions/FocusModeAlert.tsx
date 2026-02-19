import { Sparkles } from 'lucide-react';
import Card from '@/components/UI/Card';

export default function FocusModeAlert({ onDismiss }: { onDismiss?: () => void }) {
    return (
        <Card className="border-purple-500/20">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/15">
                    <Sparkles size={20} className="text-purple-400 animate-pulse" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-dark-100">Flow State Detected ✨</h3>
                    <p className="text-xs text-dark-400">
                        You're in the zone! Notifications are paused to protect your focus.
                    </p>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="px-3 py-1.5 rounded-lg text-xs text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
                    >
                        Got it
                    </button>
                )}
            </div>
        </Card>
    );
}
