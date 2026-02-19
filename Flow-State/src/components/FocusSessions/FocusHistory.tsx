import { useEffect, useState } from 'react';
import { Clock, Zap, AlertCircle } from 'lucide-react';
import Card from '@/components/UI/Card';

interface FocusSession {
  id: number;
  task_title: string | null;
  start_time: string;
  actual_duration: number;
  interruption_count: number;
  completed: boolean;
  energy_at_start: number;
  energy_at_end: number;
}

interface FocusStats {
  total_sessions: number;
  completed_sessions: number;
  total_focus_time: number;
  avg_session_duration: number;
  total_interruptions: number;
  avg_interruptions_per_session: number;
}

export default function FocusHistory() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyData, statsData] = await Promise.all([
        window.electron.getFocusHistory(20),
        window.electron.getFocusStats(7),
      ]);

      setSessions(historyData || []);
      setStats(statsData);
    } catch (error) {
      console.error('[FocusHistory] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-400">Loading focus history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-100">Focus History</h2>
        <p className="text-sm text-dark-400 mt-1">Your past focus sessions and statistics</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-500">Total Focus Time</p>
                <p className="text-2xl font-bold text-dark-100 mt-1">
                  {formatDuration(stats.total_focus_time || 0)}
                </p>
                <p className="text-xs text-dark-500 mt-1">Last 7 days</p>
              </div>
              <Clock className="text-blue-400" size={20} />
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-500">Completion Rate</p>
                <p className="text-2xl font-bold text-dark-100 mt-1">
                  {stats.total_sessions > 0
                    ? Math.round((stats.completed_sessions / stats.total_sessions) * 100)
                    : 0}
                  %
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  {stats.completed_sessions}/{stats.total_sessions} completed
                </p>
              </div>
              <Zap className="text-green-400" size={20} />
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-500">Avg Interruptions</p>
                <p className="text-2xl font-bold text-dark-100 mt-1">
                  {stats.avg_interruptions_per_session?.toFixed(1) || 0}
                </p>
                <p className="text-xs text-dark-500 mt-1">Per session</p>
              </div>
              <AlertCircle className="text-amber-400" size={20} />
            </div>
          </Card>
        </div>
      )}

      {/* Session List */}
      <Card>
        <h3 className="font-semibold text-dark-100 mb-4">Recent Sessions</h3>

        {sessions.length === 0 ? (
          <div className="text-center py-12 text-dark-500">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>No focus sessions yet</p>
            <p className="text-sm mt-1">Start your first session from the Focus Timer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg bg-dark-900/40 border border-dark-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        session.completed ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <p className="text-dark-200 font-medium">
                        {session.task_title || 'Untitled Session'}
                      </p>
                      <p className="text-xs text-dark-500">{formatDate(session.start_time)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-dark-400">{formatDuration(session.actual_duration)}</p>
                    <p className="text-xs text-dark-500">Duration</p>
                  </div>

                  {session.interruption_count > 0 && (
                    <div className="text-right">
                      <p className="text-amber-400">{session.interruption_count}</p>
                      <p className="text-xs text-dark-500">Interruptions</p>
                    </div>
                  )}

                  {session.energy_at_start && session.energy_at_end && (
                    <div className="text-right">
                      <p
                        className={
                          session.energy_at_end >= session.energy_at_start
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {session.energy_at_end >= session.energy_at_start ? '↑' : '↓'}
                        {Math.abs(session.energy_at_end - session.energy_at_start)}
                      </p>
                      <p className="text-xs text-dark-500">Energy</p>
                    </div>
                  )}

                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      session.completed
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {session.completed ? 'Completed' : 'Incomplete'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
