import { useEffect, useState } from 'react';
import Card from '@/components/UI/Card';

export default function DatabaseStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await window.electron?.getDatabaseStats();
      setStats(data);
      setLoading(false);
      console.log('[DatabaseStats] Loaded:', data);
    } catch (err) {
      console.error('[DatabaseStats] Error:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-dark-400">Loading database stats...</div>;
  }

  if (!stats || stats.error) {
    return (
      <div className="text-red-500">
        Error loading database: {stats?.error || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-100">Database Statistics</h2>
        <p className="text-sm text-dark-400 mt-1">
          {stats.dbPath}
        </p>
      </div>

      {/* Table Counts */}
      <Card>
        <h3 className="text-lg font-semibold text-dark-100 mb-4">Table Record Counts</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.tableCounts).map(([table, count]) => (
            <div key={table} className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-300 font-mono text-sm">{table}</span>
              <span className="text-blue-400 font-bold">{count as number}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Focus Sessions */}
      {stats.samples.focusSessions.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-dark-100 mb-4">
            Recent Focus Sessions ({stats.samples.focusSessions.length})
          </h3>
          <pre className="text-xs text-dark-300 bg-dark-900 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(stats.samples.focusSessions, null, 2)}
          </pre>
        </Card>
      )}

      {/* Tasks */}
      {stats.samples.tasks.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-dark-100 mb-4">
            Recent Tasks ({stats.samples.tasks.length})
          </h3>
          <pre className="text-xs text-dark-300 bg-dark-900 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(stats.samples.tasks, null, 2)}
          </pre>
        </Card>
      )}

      {/* Activity Events */}
      {stats.samples.activityEvents.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-dark-100 mb-4">
            Recent Activity Events ({stats.samples.activityEvents.length})
          </h3>
          <pre className="text-xs text-dark-300 bg-dark-900 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(stats.samples.activityEvents, null, 2)}
          </pre>
        </Card>
      )}

      {/* Hourly Metrics */}
      {stats.samples.hourlyMetrics.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-dark-100 mb-4">
            Recent Hourly Metrics ({stats.samples.hourlyMetrics.length})
          </h3>
          <pre className="text-xs text-dark-300 bg-dark-900 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(stats.samples.hourlyMetrics, null, 2)}
          </pre>
        </Card>
      )}

      <div className="flex gap-3">
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Refresh Stats
        </button>
      </div>
    </div>
  );
}
