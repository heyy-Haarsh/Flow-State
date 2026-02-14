import { useEffect, useState } from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';
import { useFocusStore } from '@/stores/focus-store';
import { useFlowStateStore } from '@/stores/flowstate-store';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';

const DURATION_PRESETS = [
  { label: '25 min', value: 25 * 60, type: 'pomodoro' },
  { label: '45 min', value: 45 * 60, type: 'deep-work' },
  { label: '60 min', value: 60 * 60, type: 'extended' },
  { label: '90 min', value: 90 * 60, type: 'ultradian' },
];

export default function FocusTimer() {
  const {
    activeSession,
    timerSeconds,
    elapsedSeconds,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    tick,
    loadActiveSession,
  } = useFocusStore();

  const tasks = useFlowStateStore((s) => s.tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const [selectedType, setSelectedType] = useState('pomodoro');
  const [showCompletion, setShowCompletion] = useState(false);
  const [loadedTasks, setLoadedTasks] = useState<any[]>([]);

  // Load active session and tasks on mount
  useEffect(() => {
    loadActiveSession();

    // Load tasks from database
    if (window.electron?.getTasks) {
      window.electron.getTasks().then((dbTasks: any) => {
        setLoadedTasks(dbTasks || []);
      }).catch((err: any) => {
        console.error('[FocusTimer] Failed to load tasks:', err);
      });
    }
  }, []);

  // Timer tick
  useEffect(() => {
    if (!activeSession || activeSession.isPaused) return;

    const interval = setInterval(() => {
      tick();

      // Check if timer completed
      if (timerSeconds <= 1 && !showCompletion) {
        setShowCompletion(true);
        // Play notification sound (optional)
        try {
          new Audio('/notification.mp3').play().catch(() => {});
        } catch (e) {
          // Audio not available
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, tick, timerSeconds, showCompletion]);

  const handleStart = async () => {
    console.log('[FocusTimer] Starting session...', { selectedTaskId, selectedDuration, selectedType });
    console.log('[FocusTimer] window.electron available?', !!window.electron);

    try {
      await startSession(selectedTaskId, selectedDuration, selectedType);
      setShowCompletion(false);
      console.log('[FocusTimer] Session started successfully');
    } catch (error) {
      console.error('[FocusTimer] Failed to start session:', error);
      alert('Failed to start focus session: ' + error.message);
    }
  };

  const handlePause = () => {
    if (activeSession?.isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  const handleStop = async () => {
    await endSession(false);
    setShowCompletion(false);
  };

  const handleComplete = async () => {
    await endSession(true);
    setShowCompletion(false);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress =
    activeSession && activeSession.plannedDuration > 0
      ? ((activeSession.plannedDuration - timerSeconds) / activeSession.plannedDuration) * 100
      : 0;

  // Use loaded tasks from database, fallback to store tasks
  const allTasks = loadedTasks.length > 0 ? loadedTasks : tasks;
  const pendingTasks = allTasks.filter((t: any) => t.status !== 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-100">Focus Timer</h2>
        <p className="text-sm text-dark-400 mt-1">
          Deep work sessions with interruption tracking
        </p>
      </div>

      {/* Completion Screen */}
      {showCompletion && activeSession && (
        <Card className="border-green-500/30 bg-green-500/5">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-dark-100 mb-2">Session Complete!</h3>
            <p className="text-dark-400 mb-6">
              Great work! You completed {Math.floor(activeSession.plannedDuration / 60)} minutes of
              focused work.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleComplete} variant="primary">
                Mark as Completed
              </Button>
              <Button onClick={handleStop} variant="secondary">
                End Session
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Timer Display */}
      <Card>
        <div className="flex flex-col items-center py-8">
          {/* Circular Timer */}
          <div className="relative w-64 h-64 mb-8">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-dark-800"
              />
              {/* Progress Circle */}
              {activeSession && (
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                  className={`transition-all ${
                    timerSeconds < 60 ? 'text-red-500' : 'text-blue-500'
                  }`}
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Timer Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-mono font-bold text-dark-100">
                {activeSession ? formatTime(timerSeconds) : formatTime(selectedDuration)}
              </div>
              {activeSession && (
                <div className="text-sm text-dark-400 mt-2">
                  {activeSession.isPaused ? 'Paused' : 'In Progress'}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          {!activeSession ? (
            <div className="w-full max-w-md space-y-4">
              {/* Task Selection */}
              {pendingTasks.length > 0 && (
                <div>
                  <label className="block text-sm text-dark-300 mb-2">
                    Link to Task (Optional)
                  </label>
                  <select
                    value={selectedTaskId || ''}
                    onChange={(e) =>
                      setSelectedTaskId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                  >
                    <option value="">No task selected</option>
                    {pendingTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration Presets */}
              <div>
                <label className="block text-sm text-dark-300 mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setSelectedDuration(preset.value);
                        setSelectedType(preset.type);
                      }}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        selectedDuration === preset.value
                          ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                          : 'border-dark-600 text-dark-400 hover:border-dark-500'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <Button onClick={handleStart} variant="primary" className="w-full" size="lg">
                <Play size={20} className="mr-2" />
                Start Focus Session
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={handlePause} variant="secondary" size="lg">
                {activeSession.isPaused ? (
                  <>
                    <Play size={20} className="mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause size={20} className="mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button onClick={handleStop} variant="secondary" size="lg">
                <Square size={20} className="mr-2" />
                End Session
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Session Info */}
      {activeSession && (
        <Card>
          <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
            <Timer size={16} className="text-blue-400" />
            Session Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-dark-500">Session Type</p>
              <p className="text-dark-200 font-medium capitalize">{activeSession.sessionType}</p>
            </div>
            <div>
              <p className="text-dark-500">Elapsed Time</p>
              <p className="text-dark-200 font-medium">{formatTime(elapsedSeconds)}</p>
            </div>
            <div>
              <p className="text-dark-500">Planned Duration</p>
              <p className="text-dark-200 font-medium">
                {Math.floor(activeSession.plannedDuration / 60)} minutes
              </p>
            </div>
            <div>
              <p className="text-dark-500">Progress</p>
              <p className="text-dark-200 font-medium">{Math.round(progress)}%</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
