import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Battery,
  Zap,
  Clock,
  Target,
  Activity,
  RefreshCw,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';

interface BurnoutAnalysis {
  status: string;
  compositeScore?: number;
  riskLevel?: {
    label: string;
    color: string;
    min: number;
    max: number;
  };
  trend?: 'deteriorating' | 'stable' | 'recovering';
  components?: {
    velocity: number;
    recovery: number;
    variance: number;
    overwork: number;
    qualityPace: number;
    avoidance: number;
  };
  dominantFactors?: Array<{
    factor: string;
    score: number;
  }>;
  recommendations?: Array<{
    priority: string;
    title: string;
    description: string;
    actions: string[];
  }>;
  message?: string;
  weeksAvailable?: number;
}

export default function BurnoutRisk() {
  const [analysis, setAnalysis] = useState<BurnoutAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [useDemoData, setUseDemoData] = useState(true); // Start with demo mode ON
  const [scenarioIndex, setScenarioIndex] = useState(0);

  useEffect(() => {
    loadBurnoutAnalysis();
  }, [useDemoData, scenarioIndex]);

  const loadBurnoutAnalysis = async () => {
    try {
      setLoading(true);
      // Call IPC to get burnout analysis (with demo flag and scenario index)
      const result = await window.electron.getBurnoutAnalysis(useDemoData, scenarioIndex);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to load burnout analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDemoMode = () => {
    setUseDemoData(!useDemoData);
    setScenarioIndex(0); // Reset to first scenario
  };

  const nextScenario = () => {
    setScenarioIndex((prev) => (prev + 1) % 5); // Cycle through 5 scenarios
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'deteriorating':
        return <TrendingDown size={16} className="text-red-400" />;
      case 'recovering':
        return <TrendingUp size={16} className="text-green-400" />;
      default:
        return <Minus size={16} className="text-blue-400" />;
    }
  };

  const getComponentIcon = (factor: string) => {
    const icons = {
      velocity: <Target size={16} />,
      recovery: <Battery size={16} />,
      variance: <Activity size={16} />,
      overwork: <Clock size={16} />,
      qualityPace: <Zap size={16} />,
      avoidance: <AlertTriangle size={16} />,
    };
    return icons[factor as keyof typeof icons] || <Activity size={16} />;
  };

  const getFactorLabel = (factor: string) => {
    const labels = {
      velocity: 'Performance Velocity',
      recovery: 'Recovery Effectiveness',
      variance: 'Energy Variance',
      overwork: 'Overwork Patterns',
      qualityPace: 'Quality-Pace Balance',
      avoidance: 'Task Complexity',
    };
    return labels[factor as keyof typeof labels] || factor;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/15 border-red-500/30 text-red-400';
      case 'high':
        return 'bg-orange-500/15 border-orange-500/30 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400';
      default:
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <RefreshCw size={24} className="animate-spin mx-auto text-dark-500 mb-2" />
          <p className="text-dark-400 text-sm">Analyzing burnout risk...</p>
        </div>
      </Card>
    );
  }

  if (!analysis || analysis.status === 'insufficient_data') {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-dark-100 mb-1">Burnout Analysis Pending</h3>
            <p className="text-sm text-dark-400">
              {analysis?.message || 'Need at least 4 weeks of data for burnout analysis'}
            </p>
            {analysis?.weeksAvailable !== undefined && (
              <p className="text-xs text-dark-500 mt-2">
                Weeks available: {analysis.weeksAvailable} / 4 required
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const { compositeScore, riskLevel, trend, components, dominantFactors, recommendations } =
    analysis;

  return (
    <div className="space-y-4">
      {/* Demo Mode Banner */}
      {analysis?.isDemo && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <AlertTriangle size={16} className="text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-300 font-medium">
                  {analysis.demoMessage || 'Demo Mode Active'}
                </p>
                <p className="text-xs text-blue-400/80 mt-0.5">
                  Showing simulated burnout analysis. Click "Next Scenario" to see different risk levels.
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={nextScenario} variant="secondary" size="sm">
                Next Scenario
              </Button>
              <Button onClick={toggleDemoMode} variant="secondary" size="sm">
                Try Real Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Risk Score Card */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-dark-100">Burnout Risk Assessment</h3>
            <p className="text-xs text-dark-500 mt-0.5">4-week rolling analysis</p>
          </div>
          <div className="flex gap-2">
            {!analysis?.isDemo && (
              <Button onClick={toggleDemoMode} variant="secondary" size="sm">
                Show Demo
              </Button>
            )}
            <Button onClick={loadBurnoutAnalysis} variant="secondary" size="sm">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {/* Risk Score Display */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="text-3xl font-bold"
                style={{ color: riskLevel?.color }}
              >
                {Math.round((compositeScore || 0) * 100)}
              </div>
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: riskLevel?.color }}
                >
                  {riskLevel?.label} Risk
                </div>
                <div className="flex items-center gap-1 text-xs text-dark-500">
                  {getTrendIcon(trend)}
                  <span className="capitalize">{trend}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-dark-800 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(compositeScore || 0) * 100}%`,
                  backgroundColor: riskLevel?.color,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-dark-600 mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
              <span>Critical</span>
            </div>
          </div>
        </div>

        {/* Component Breakdown Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? '▼' : '▶'} Show component breakdown
        </button>
      </Card>

      {/* Component Breakdown */}
      {expanded && components && (
        <Card>
          <h4 className="text-sm font-semibold text-dark-100 mb-3">Risk Components</h4>
          <div className="space-y-2">
            {Object.entries(components).map(([factor, score]) => (
              <div key={factor} className="flex items-center gap-3">
                <div className="text-dark-400">{getComponentIcon(factor)}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-dark-300">{getFactorLabel(factor)}</span>
                    <span className="text-dark-500">{Math.round(score * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${score * 100}%`,
                        backgroundColor:
                          score > 0.6
                            ? '#ef4444'
                            : score > 0.35
                              ? '#f59e0b'
                              : '#10b981',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dominant Factors */}
      {dominantFactors && dominantFactors.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-dark-100 mb-3">Primary Risk Factors</h4>
          <div className="space-y-2">
            {dominantFactors.map(({ factor, score }) => (
              <div
                key={factor}
                className="flex items-center justify-between px-3 py-2 bg-dark-800/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {getComponentIcon(factor)}
                  <span className="text-sm text-dark-200">{getFactorLabel(factor)}</span>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: score > 0.6 ? '#ef4444' : score > 0.35 ? '#f59e0b' : '#10b981',
                  }}
                >
                  {Math.round(score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-dark-100 mb-3">Recommendations</h4>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-3 ${getPriorityColor(rec.priority)}`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-sm">{rec.title}</h5>
                    <p className="text-xs mt-1 opacity-90">{rec.description}</p>
                  </div>
                </div>
                <ul className="ml-6 space-y-1">
                  {rec.actions.map((action, actionIdx) => (
                    <li key={actionIdx} className="text-xs opacity-80">
                      • {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
