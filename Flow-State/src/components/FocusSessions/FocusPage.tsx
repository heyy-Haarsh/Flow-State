import { useState } from 'react';
import FocusTimer from './FocusTimer';
import FocusHistory from './FocusHistory';

export default function FocusPage() {
  const [activeTab, setActiveTab] = useState<'timer' | 'history'>('timer');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-dark-700">
        <button
          onClick={() => setActiveTab('timer')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'timer'
              ? 'text-blue-400'
              : 'text-dark-400 hover:text-dark-300'
          }`}
        >
          Focus Timer
          {activeTab === 'timer' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'history'
              ? 'text-blue-400'
              : 'text-dark-400 hover:text-dark-300'
          }`}
        >
          History
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'timer' ? <FocusTimer /> : <FocusHistory />}
    </div>
  );
}
