/**
 * Burnout Handling Framework
 * Early Detection & Cognitive Sustainability Monitoring
 *
 * Detects early signs of cognitive overload using behavioral analytics
 */

const queries = require('../database/queries');

class BurnoutAnalyzer {
  constructor() {
    this.WEIGHTS = {
      velocity: 0.25,
      recovery: 0.25,
      variance: 0.20,
      overwork: 0.15,
      qualityPace: 0.10,
      avoidance: 0.05,
    };

    this.RISK_LEVELS = {
      LOW: { min: 0.00, max: 0.35, label: 'Low', color: '#10b981' },
      MEDIUM: { min: 0.35, max: 0.60, label: 'Medium', color: '#f59e0b' },
      HIGH: { min: 0.60, max: 0.80, label: 'High', color: '#ef4444' },
      CRITICAL: { min: 0.80, max: 1.00, label: 'Critical', color: '#dc2626' },
    };
  }

  /**
   * Get demo scenario based on index (cycles through different risk levels)
   */
  getDemoScenarios() {
    return [
      // Scenario 1: Medium Risk - Recovery Deficit dominant
      {
        name: 'Medium Risk - Recovery Issues',
        velocity: 0.42,
        recovery: 0.58,
        variance: 0.35,
        overwork: 0.52,
        qualityPace: 0.28,
        avoidance: 0.15,
        trend: 'deteriorating',
      },
      // Scenario 2: Low Risk - Healthy patterns
      {
        name: 'Low Risk - Healthy State',
        velocity: 0.18,
        recovery: 0.22,
        variance: 0.15,
        overwork: 0.20,
        qualityPace: 0.12,
        avoidance: 0.08,
        trend: 'stable',
      },
      // Scenario 3: High Risk - Multiple factors
      {
        name: 'High Risk - Multiple Factors',
        velocity: 0.65,
        recovery: 0.68,
        variance: 0.72,
        overwork: 0.58,
        qualityPace: 0.45,
        avoidance: 0.38,
        trend: 'deteriorating',
      },
      // Scenario 4: Critical Risk - Severe burnout
      {
        name: 'Critical Risk - Intervention Needed',
        velocity: 0.85,
        recovery: 0.92,
        variance: 0.88,
        overwork: 0.82,
        qualityPace: 0.75,
        avoidance: 0.62,
        trend: 'deteriorating',
      },
      // Scenario 5: Recovery - Improving state
      {
        name: 'Medium Risk - Recovering',
        velocity: 0.45,
        recovery: 0.38,
        variance: 0.42,
        overwork: 0.35,
        qualityPace: 0.28,
        avoidance: 0.20,
        trend: 'recovering',
      },
    ];
  }

  /**
   * Generate realistic demo/mock data for testing
   */
  generateDemoAnalysis(scenarioIndex = 0) {
    const scenarios = this.getDemoScenarios();
    const scenario = scenarios[scenarioIndex % scenarios.length];

    const { velocity, recovery, variance, overwork, qualityPace, avoidance, trend, name } = scenario;

    const compositeScore =
      (velocity * this.WEIGHTS.velocity) +
      (recovery * this.WEIGHTS.recovery) +
      (variance * this.WEIGHTS.variance) +
      (overwork * this.WEIGHTS.overwork) +
      (qualityPace * this.WEIGHTS.qualityPace) +
      (avoidance * this.WEIGHTS.avoidance);

    const riskLevel = this.getRiskLevel(compositeScore);
    const dominantFactors = this.identifyDominantFactors({ velocity, recovery, variance, overwork, qualityPace, avoidance });
    const recommendations = this.generateRecommendations(dominantFactors, riskLevel);

    return {
      status: 'success',
      isDemo: true,
      scenarioName: name,
      compositeScore: Math.round(compositeScore * 100) / 100,
      riskLevel,
      trend,
      components: {
        velocity: Math.round(velocity * 100) / 100,
        recovery: Math.round(recovery * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        overwork: Math.round(overwork * 100) / 100,
        qualityPace: Math.round(qualityPace * 100) / 100,
        avoidance: Math.round(avoidance * 100) / 100,
      },
      dominantFactors,
      recommendations,
      timestamp: new Date().toISOString(),
      demoMessage: `📊 Demo Scenario: ${name}`,
    };
  }

  /**
   * Main analysis entry point
   * Computes burnout risk score using 4-week rolling window
   */
  async analyzeBurnoutRisk(useDemoData = false, scenarioIndex = 0) {
    try {
      // Demo mode for testing/demonstration
      if (useDemoData) {
        return this.generateDemoAnalysis(scenarioIndex);
      }

      // Check if we have enough data (minimum 4 weeks)
      const hasEnoughData = await this.hasMinimumDataRequirement();
      if (!hasEnoughData) {
        // Return demo data if no real data available
        const demoResult = this.generateDemoAnalysis(scenarioIndex);
        demoResult.insufficientDataFallback = true;
        return demoResult;
      }

      // Get 8 weeks of data (current 4 weeks vs previous 4 weeks)
      const current4Weeks = await this.getWeeklyAggregates(0, 4);
      const previous4Weeks = await this.getWeeklyAggregates(4, 4);

      // Calculate each risk factor
      const velocity = this.calculateVelocityDecline(current4Weeks, previous4Weeks);
      const recovery = this.calculateRecoveryDeficit(current4Weeks, previous4Weeks);
      const variance = this.calculateEnergyVarianceCollapse(current4Weeks, previous4Weeks);
      const overwork = this.calculateOverworkPatterns(current4Weeks);
      const qualityPace = this.calculateQualityPaceInversion(current4Weeks, previous4Weeks);
      const avoidance = this.calculateTaskComplexityAvoidance(current4Weeks, previous4Weeks);

      // Compute composite score
      const compositeScore =
        (velocity * this.WEIGHTS.velocity) +
        (recovery * this.WEIGHTS.recovery) +
        (variance * this.WEIGHTS.variance) +
        (overwork * this.WEIGHTS.overwork) +
        (qualityPace * this.WEIGHTS.qualityPace) +
        (avoidance * this.WEIGHTS.avoidance);

      // Determine risk level and trend
      const riskLevel = this.getRiskLevel(compositeScore);
      const trend = this.calculateTrend(current4Weeks);
      const dominantFactors = this.identifyDominantFactors({ velocity, recovery, variance, overwork, qualityPace, avoidance });
      const recommendations = this.generateRecommendations(dominantFactors, riskLevel);

      const result = {
        status: 'success',
        compositeScore: Math.round(compositeScore * 100) / 100,
        riskLevel,
        trend,
        components: {
          velocity: Math.round(velocity * 100) / 100,
          recovery: Math.round(recovery * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          overwork: Math.round(overwork * 100) / 100,
          qualityPace: Math.round(qualityPace * 100) / 100,
          avoidance: Math.round(avoidance * 100) / 100,
        },
        dominantFactors,
        recommendations,
        timestamp: new Date().toISOString(),
      };

      // Store the analysis result
      this.storeBurnoutAnalysis(result);

      return result;
    } catch (error) {
      console.error('[BurnoutAnalyzer] Error analyzing burnout risk:', error);
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  /**
   * 4.1 Velocity Decline (25%)
   * Measures week-over-week reduction in performance velocity
   */
  calculateVelocityDecline(current, previous) {
    const currentAvg = this.average(current.map(w => w.tasksCompleted || 0));
    const previousAvg = this.average(previous.map(w => w.tasksCompleted || 0));

    if (previousAvg === 0) return 0;

    const decline = (previousAvg - currentAvg) / previousAvg;
    const consecutiveDrops = this.countConsecutiveDrops(current.map(w => w.tasksCompleted || 0));
    const trendSlope = this.calculateSlope(current.map(w => w.tasksCompleted || 0));

    // Normalize to 0-1 scale
    let score = 0;
    if (decline > 0.20) score += 0.5; // >20% decline
    else if (decline > 0.10) score += 0.3; // >10% decline

    if (consecutiveDrops >= 3) score += 0.3; // 3+ consecutive drops
    if (trendSlope < -0.1) score += 0.2; // Negative trend

    return Math.min(score, 1.0);
  }

  /**
   * 4.2 Recovery Deficit (25%)
   * Tracks how effectively breaks restore energy
   */
  calculateRecoveryDeficit(current, previous) {
    const currentRecovery = this.average(current.map(w => w.avgRecoveryGain || 0));
    const previousRecovery = this.average(previous.map(w => w.avgRecoveryGain || 0));

    if (previousRecovery === 0) return 0;

    const deficit = (previousRecovery - currentRecovery) / previousRecovery;
    const lowEnergyTime = this.average(current.map(w => w.lowEnergyPercentage || 0));

    // Normalize to 0-1 scale
    let score = 0;
    if (deficit > 0.30) score += 0.5; // >30% recovery decline
    else if (deficit > 0.15) score += 0.3;

    if (lowEnergyTime > 0.6) score += 0.3; // >60% time in low energy
    else if (lowEnergyTime > 0.4) score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * 4.3 Energy Variance Collapse (20%)
   * Detects flattened energy patterns
   */
  calculateEnergyVarianceCollapse(current, previous) {
    const currentVariance = this.average(current.map(w => w.energyStdDev || 0));
    const previousVariance = this.average(previous.map(w => w.energyStdDev || 0));
    const currentMeanEnergy = this.average(current.map(w => w.avgEnergy || 50));

    // Low variance + low mean energy = red flag
    const varianceCollapse = previousVariance > 0 ?
      (previousVariance - currentVariance) / previousVariance : 0;

    let score = 0;
    if (currentVariance < 10 && currentMeanEnergy < 40) score += 0.6; // Flat + low
    else if (currentVariance < 15) score += 0.3;

    if (varianceCollapse > 0.3) score += 0.4; // Significant collapse

    return Math.min(score, 1.0);
  }

  /**
   * 4.4 Overwork Patterns (15%)
   * Detects unsustainable work habits
   */
  calculateOverworkPatterns(current) {
    const longSessions = this.average(current.map(w => w.longSessionsCount || 0));
    const lateNightWork = this.average(current.map(w => w.lateNightHours || 0));
    const weekendWork = this.average(current.map(w => w.weekendHours || 0));
    const avgBreakInterval = this.average(current.map(w => w.avgBreakInterval || 60));

    let score = 0;
    if (longSessions > 5) score += 0.3; // >5 sessions >90min per week
    if (lateNightWork > 10) score += 0.3; // >10 hours after 9PM
    if (weekendWork > 8) score += 0.2; // >8 hours weekend work
    if (avgBreakInterval > 120) score += 0.2; // >2 hours between breaks

    return Math.min(score, 1.0);
  }

  /**
   * 4.5 Quality-Pace Inversion (10%)
   * Detects slow pace + high error rate
   */
  calculateQualityPaceInversion(current, previous) {
    const currentPace = this.average(current.map(w => w.avgKeysPerMin || 0));
    const previousPace = this.average(previous.map(w => w.avgKeysPerMin || 0));
    const currentErrorRate = this.average(current.map(w => w.avgErrorRate || 0));
    const previousErrorRate = this.average(previous.map(w => w.avgErrorRate || 0));

    const paceSlowing = previousPace > 0 ? (previousPace - currentPace) / previousPace : 0;
    const errorsIncreasing = currentErrorRate > previousErrorRate;

    let score = 0;
    if (paceSlowing > 0.15 && errorsIncreasing) score = 0.8; // Clear inversion
    else if (paceSlowing > 0.10 && currentErrorRate > 0.05) score = 0.5;
    else if (paceSlowing > 0.05) score = 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * 4.6 Task Complexity Avoidance (5%)
   * Tracks decline in complex task completion
   */
  calculateTaskComplexityAvoidance(current, previous) {
    const currentComplexPct = this.average(
      current.map(w => (w.complexTasksCompleted || 0) / Math.max(w.tasksCompleted || 1, 1))
    );
    const previousComplexPct = this.average(
      previous.map(w => (w.complexTasksCompleted || 0) / Math.max(w.tasksCompleted || 1, 1))
    );

    if (previousComplexPct === 0) return 0;

    const avoidance = (previousComplexPct - currentComplexPct) / previousComplexPct;

    let score = 0;
    if (avoidance > 0.30) score = 0.8; // >30% decline
    else if (avoidance > 0.15) score = 0.5;
    else if (avoidance > 0.05) score = 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Helper: Calculate trend direction
   */
  calculateTrend(weeks) {
    const scores = weeks.map(w => w.burnoutScore || 0);
    const slope = this.calculateSlope(scores);

    if (slope > 0.05) return 'deteriorating';
    if (slope < -0.05) return 'recovering';
    return 'stable';
  }

  /**
   * Helper: Identify dominant risk factors
   */
  identifyDominantFactors(components) {
    const entries = Object.entries(components)
      .filter(([_, value]) => value > 0.4) // Only include significant factors
      .sort((a, b) => b[1] - a[1]); // Sort by score descending

    return entries.slice(0, 3).map(([factor, score]) => ({
      factor,
      score: Math.round(score * 100) / 100,
    }));
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(dominantFactors, riskLevel) {
    const recommendations = [];

    dominantFactors.forEach(({ factor, score }) => {
      switch (factor) {
        case 'velocity':
          recommendations.push({
            priority: 'high',
            title: 'Reduce Workload Temporarily',
            description: 'Your output has declined consistently. Consider lighter tasks or workload redistribution.',
            actions: ['Focus on simpler tasks', 'Delegate complex work if possible', 'Review task priorities'],
          });
          break;

        case 'recovery':
          recommendations.push({
            priority: 'high',
            title: 'Improve Break Effectiveness',
            description: 'Breaks are not restoring your energy effectively.',
            actions: ['Take longer breaks (15-20 min)', 'Try active breaks (walk, stretch)', 'Consider a rest day'],
          });
          break;

        case 'variance':
          recommendations.push({
            priority: 'medium',
            title: 'Address Chronic Fatigue',
            description: 'Your energy levels are persistently low without natural peaks.',
            actions: ['Improve sleep quality', 'Check for underlying health issues', 'Reduce evening screen time'],
          });
          break;

        case 'overwork':
          recommendations.push({
            priority: 'high',
            title: 'Establish Work Boundaries',
            description: 'Unsustainable work patterns detected (long sessions, late nights, weekends).',
            actions: ['Limit sessions to 90 minutes', 'Avoid work after 9 PM', 'Protect weekend recovery time'],
          });
          break;

        case 'qualityPace':
          recommendations.push({
            priority: 'medium',
            title: 'Cognitive Overload Detected',
            description: 'Working slower yet making more errors suggests mental strain.',
            actions: ['Take a mental health break', 'Simplify your workflow', 'Reduce multitasking'],
          });
          break;

        case 'avoidance':
          recommendations.push({
            priority: 'low',
            title: 'Re-engage with Challenging Work',
            description: 'You may be unconsciously avoiding complex tasks.',
            actions: ['Start with one complex task daily', 'Break down difficult tasks', 'Build confidence gradually'],
          });
          break;
      }
    });

    // Add critical-level recommendations
    if (riskLevel.label === 'Critical') {
      recommendations.unshift({
        priority: 'critical',
        title: 'Immediate Intervention Required',
        description: 'Multiple severe burnout indicators detected.',
        actions: [
          'Consider taking 2-3 days off',
          'Discuss workload with your manager',
          'Seek professional support if needed',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Determine risk level from composite score
   */
  getRiskLevel(score) {
    for (const [key, level] of Object.entries(this.RISK_LEVELS)) {
      if (score >= level.min && score <= level.max) {
        return { ...level, key };
      }
    }
    return this.RISK_LEVELS.LOW;
  }

  /**
   * Helper: Calculate linear regression slope
   */
  calculateSlope(values) {
    const n = values.length;
    if (n < 2) return 0;

    const xMean = (n - 1) / 2;
    const yMean = this.average(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Helper: Count consecutive drops
   */
  countConsecutiveDrops(values) {
    let maxDrops = 0;
    let currentDrops = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i - 1]) {
        currentDrops++;
        maxDrops = Math.max(maxDrops, currentDrops);
      } else {
        currentDrops = 0;
      }
    }

    return maxDrops;
  }

  /**
   * Helper: Calculate average
   */
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Check if minimum data requirement is met (4 weeks)
   */
  async hasMinimumDataRequirement() {
    const weeks = await this.getAvailableWeeks();
    return weeks >= 4;
  }

  /**
   * Get number of weeks with data
   */
  async getAvailableWeeks() {
    try {
      // This would query actual data - placeholder for now
      const sessions = queries.getAllSessions?.() || [];
      if (sessions.length === 0) return 0;

      const firstSession = sessions[sessions.length - 1];
      const firstDate = new Date(firstSession.startTime);
      const now = new Date();
      const diffWeeks = Math.floor((now - firstDate) / (1000 * 60 * 60 * 24 * 7));

      return diffWeeks;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get weekly aggregates for analysis
   * @param {number} weekOffset - Weeks back from current week
   * @param {number} count - Number of weeks to retrieve
   */
  async getWeeklyAggregates(weekOffset = 0, count = 4) {
    // This will aggregate real data from the database
    // For now, returning structure
    const weeks = [];

    for (let i = 0; i < count; i++) {
      const weekData = await this.getWeekData(weekOffset + i);
      weeks.push(weekData);
    }

    return weeks;
  }

  /**
   * Get data for a specific week
   */
  async getWeekData(weeksBack) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (weeksBack * 7));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    // Query actual database - this is a placeholder structure
    return {
      weekNumber: weeksBack,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      tasksCompleted: 0,
      complexTasksCompleted: 0,
      avgEnergy: 50,
      energyStdDev: 15,
      avgRecoveryGain: 10,
      lowEnergyPercentage: 0.3,
      longSessionsCount: 3,
      lateNightHours: 5,
      weekendHours: 0,
      avgBreakInterval: 60,
      avgKeysPerMin: 50,
      avgErrorRate: 0.03,
      burnoutScore: 0,
    };
  }

  /**
   * Store burnout analysis result
   */
  storeBurnoutAnalysis(result) {
    try {
      // This would store in database
      console.log('[BurnoutAnalyzer] Analysis complete:', {
        score: result.compositeScore,
        level: result.riskLevel.label,
        trend: result.trend,
      });
    } catch (error) {
      console.error('[BurnoutAnalyzer] Failed to store analysis:', error);
    }
  }
}

module.exports = new BurnoutAnalyzer();
