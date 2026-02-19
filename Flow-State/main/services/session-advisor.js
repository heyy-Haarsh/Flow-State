/**
 * Session Duration Advisor
 * Analyzes past behavior to suggest optimal focus session durations
 */

const queries = require('../database/queries');

class SessionAdvisor {
  constructor() {
    this.MINIMUM_SESSIONS_FOR_ANALYSIS = 3;
  }

  /**
   * Get smart session duration suggestion based on user's history
   * @returns {Object} Suggested duration and reasoning
   */
  async getSuggestedDuration() {
    try {
      const currentHour = new Date().getHours();
      const currentDayOfWeek = new Date().getDay();

      // Get historical focus sessions
      const recentSessions = await this.getRecentSessions(30); // Last 30 sessions

      if (recentSessions.length < this.MINIMUM_SESSIONS_FOR_ANALYSIS) {
        return this.getDefaultSuggestion();
      }

      // Analyze patterns
      const averageDuration = this.calculateAverageDuration(recentSessions);
      const timeOfDayPattern = this.analyzeTimeOfDayPattern(recentSessions, currentHour);
      const completionRateByDuration = this.analyzeCompletionRates(recentSessions);
      const optimalDuration = this.findOptimalDuration(recentSessions);

      // Get current context
      const currentEnergy = await this.getCurrentEnergy();
      const timeOfDayCategory = this.categorizeTimeOfDay(currentHour);

      // Calculate suggestion
      let suggestedDuration = optimalDuration;
      let confidence = 'medium';
      let reasons = [];

      // Adjust based on time of day
      if (timeOfDayPattern.avgDuration > 0) {
        suggestedDuration = Math.round((suggestedDuration + timeOfDayPattern.avgDuration) / 2);
        reasons.push(`You typically work ${timeOfDayPattern.avgDuration} min at this hour`);
        confidence = 'high';
      }

      // Adjust based on current energy
      if (currentEnergy < 40) {
        suggestedDuration = Math.min(suggestedDuration, 25);
        reasons.push('Current low energy → shorter session recommended');
      } else if (currentEnergy > 70) {
        suggestedDuration = Math.max(suggestedDuration, 45);
        reasons.push('High energy detected → longer session possible');
      }

      // Round to common intervals (15, 25, 45, 60, 90)
      suggestedDuration = this.roundToCommonInterval(suggestedDuration);

      return {
        suggestedDuration,
        confidence, // low, medium, high
        reasons,
        alternativeDurations: this.getAlternatives(suggestedDuration),
        stats: {
          averageDuration: Math.round(averageDuration),
          totalSessions: recentSessions.length,
          completionRate: this.calculateOverallCompletionRate(recentSessions),
          bestTimeOfDay: timeOfDayCategory,
          currentEnergy,
        },
      };
    } catch (error) {
      console.error('[SessionAdvisor] Error generating suggestion:', error);
      return this.getDefaultSuggestion();
    }
  }

  /**
   * Get recent focus sessions from database
   */
  async getRecentSessions(limit = 30) {
    try {
      const sessions = queries.getFocusHistory(limit);
      return sessions.filter(s => s.duration > 0 && s.endTime); // Only completed sessions
    } catch (error) {
      console.error('[SessionAdvisor] Error fetching sessions:', error);
      return [];
    }
  }

  /**
   * Calculate average session duration
   */
  calculateAverageDuration(sessions) {
    if (sessions.length === 0) return 45;
    const sum = sessions.reduce((total, s) => total + s.duration, 0);
    return sum / sessions.length;
  }

  /**
   * Analyze patterns for specific time of day
   */
  analyzeTimeOfDayPattern(sessions, currentHour) {
    // Group sessions by hour (±1 hour window)
    const relevantSessions = sessions.filter(s => {
      const sessionHour = new Date(s.startTime).getHours();
      return Math.abs(sessionHour - currentHour) <= 1;
    });

    if (relevantSessions.length === 0) {
      return { avgDuration: 0, count: 0 };
    }

    const avgDuration = this.calculateAverageDuration(relevantSessions);
    return {
      avgDuration: Math.round(avgDuration),
      count: relevantSessions.length,
    };
  }

  /**
   * Analyze completion rates by duration buckets
   */
  analyzeCompletionRates(sessions) {
    const buckets = {
      short: { durations: [], completed: 0, total: 0 }, // 15-30 min
      medium: { durations: [], completed: 0, total: 0 }, // 31-60 min
      long: { durations: [], completed: 0, total: 0 }, // 61+ min
    };

    sessions.forEach(s => {
      const bucket =
        s.duration <= 30 ? 'short' :
        s.duration <= 60 ? 'medium' : 'long';

      buckets[bucket].durations.push(s.duration);
      buckets[bucket].total++;
      if (s.completed) buckets[bucket].completed++;
    });

    return Object.entries(buckets).reduce((acc, [key, data]) => {
      acc[key] = data.total > 0 ? data.completed / data.total : 0;
      return acc;
    }, {});
  }

  /**
   * Find optimal duration based on completion rates
   */
  findOptimalDuration(sessions) {
    // Group sessions by duration and calculate completion rate
    const durationGroups = {};

    sessions.forEach(s => {
      const rounded = this.roundToCommonInterval(s.duration);
      if (!durationGroups[rounded]) {
        durationGroups[rounded] = { total: 0, completed: 0 };
      }
      durationGroups[rounded].total++;
      if (s.completed) durationGroups[rounded].completed++;
    });

    // Find duration with best completion rate (minimum 3 samples)
    let bestDuration = 45;
    let bestRate = 0;

    Object.entries(durationGroups).forEach(([duration, stats]) => {
      if (stats.total >= 3) {
        const rate = stats.completed / stats.total;
        if (rate > bestRate) {
          bestRate = rate;
          bestDuration = parseInt(duration);
        }
      }
    });

    return bestDuration;
  }

  /**
   * Get current energy level
   */
  async getCurrentEnergy() {
    try {
      const energy = await queries.getLatestEnergyScore?.();
      return energy?.smoothedScore || 50;
    } catch (error) {
      return 50; // Default to medium
    }
  }

  /**
   * Categorize time of day
   */
  categorizeTimeOfDay(hour) {
    if (hour >= 6 && hour < 9) return 'early_morning';
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'midday';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
  }

  /**
   * Round to common session intervals
   */
  roundToCommonInterval(duration) {
    const intervals = [15, 25, 45, 60, 90];
    return intervals.reduce((prev, curr) =>
      Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
    );
  }

  /**
   * Get alternative duration options
   */
  getAlternatives(suggestedDuration) {
    const alternatives = [15, 25, 45, 60, 90];
    return alternatives
      .filter(d => d !== suggestedDuration)
      .slice(0, 3);
  }

  /**
   * Calculate overall completion rate
   */
  calculateOverallCompletionRate(sessions) {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter(s => s.completed).length;
    return Math.round((completed / sessions.length) * 100);
  }

  /**
   * Default suggestion for new users
   */
  getDefaultSuggestion() {
    const currentHour = new Date().getHours();
    let suggestedDuration = 45;
    let reasons = ['Standard productivity session length'];

    // Adjust based on time of day for new users
    if (currentHour >= 14 && currentHour < 16) {
      suggestedDuration = 25; // Post-lunch dip
      reasons = ['Afternoon energy dip → shorter session recommended'];
    } else if (currentHour >= 9 && currentHour < 11) {
      suggestedDuration = 60; // Morning peak
      reasons = ['Morning peak hours → longer session recommended'];
    }

    return {
      suggestedDuration,
      confidence: 'low',
      reasons,
      alternativeDurations: [15, 25, 45, 60, 90].filter(d => d !== suggestedDuration).slice(0, 3),
      stats: {
        averageDuration: 45,
        totalSessions: 0,
        completionRate: 0,
        bestTimeOfDay: this.categorizeTimeOfDay(currentHour),
        currentEnergy: 50,
      },
      isFirstTime: true,
    };
  }

  /**
   * Get accurate system time with timezone info
   */
  getAccurateSystemTime() {
    const now = new Date();
    return {
      timestamp: now.toISOString(),
      localTime: now.toLocaleTimeString(),
      localDate: now.toLocaleDateString(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      dayOfWeek: now.getDay(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: now.getTimezoneOffset(),
      unixTimestamp: Math.floor(now.getTime() / 1000),
    };
  }
}

module.exports = new SessionAdvisor();
