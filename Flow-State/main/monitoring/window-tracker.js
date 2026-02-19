// FlowState - Active Application Window Tracker
// Tracks which applications you're using for productivity insights.
// Uses active-win to detect the currently active window.
//
// PRIVACY: We store app names and usage duration, but NOT window titles.

// active-win is ESM, so we import it dynamically in start()
let activeWin = null;
const queries = require('../database/queries');

// Default app categorizations
const DEFAULT_CATEGORIES = {
  // Productive apps
  'Code': 'productive',
  'Visual Studio Code': 'productive',
  'Vim': 'productive',
  'Emacs': 'productive',
  'Sublime Text': 'productive',
  'Atom': 'productive',
  'WebStorm': 'productive',
  'IntelliJ IDEA': 'productive',
  'PyCharm': 'productive',
  'Terminal': 'productive',
  'iTerm': 'productive',
  'cmd': 'productive',
  'PowerShell': 'productive',
  'Notion': 'productive',
  'Obsidian': 'productive',
  'Evernote': 'productive',
  'OneNote': 'productive',
  'Figma': 'productive',
  'Adobe Photoshop': 'productive',
  'Adobe Illustrator': 'productive',
  'Sketch': 'productive',
  'Microsoft Word': 'productive',
  'Microsoft Excel': 'productive',
  'Microsoft PowerPoint': 'productive',
  'Google Docs': 'productive',
  'Google Sheets': 'productive',
  'Slack': 'productive',
  'Microsoft Teams': 'productive',
  'Zoom': 'productive',

  // Distracting apps
  'YouTube': 'distracting',
  'Reddit': 'distracting',
  'Twitter': 'distracting',
  'Facebook': 'distracting',
  'Instagram': 'distracting',
  'TikTok': 'distracting',
  'Netflix': 'distracting',
  'Twitch': 'distracting',
  'Discord': 'distracting',
  'Steam': 'distracting',
  'League of Legends': 'distracting',
  'Fortnite': 'distracting',
  'Minecraft': 'distracting',
  'Spotify': 'distracting',
  'Apple Music': 'distracting',
};

class WindowTracker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = null;
    this.currentApp = null;
    this.currentAppStartTime = null;
    this.sessionId = null;
    this.appSwitchCount = 0;
  }

  /**
   * Start tracking active window
   * @param {string} sessionId - Current session ID
   */
  async start(sessionId) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.sessionId = sessionId;
    this.appSwitchCount = 0;

    // Initialize default categories if needed
    await this.initializeCategories();

    // Dynamically load active-win (ESM module) if not already loaded
    if (!activeWin) {
      try {
        const module = await import('active-win');
        activeWin = module.default;
      } catch (err) {
        console.error('[WindowTracker] Failed to load active-win:', err);
      }
    }

    // Start polling every 5 seconds
    this.pollInterval = setInterval(() => {
      this.checkActiveWindow();
    }, 5000);

    console.log('[WindowTracker] Started - polling every 5 seconds');
  }

  /**
   * Stop tracking
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Save current app usage before stopping
    if (this.currentApp) {
      this.saveAppUsage();
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log('[WindowTracker] Stopped');
  }

  /**
   * Check currently active window
   */
  async checkActiveWindow() {
    try {
      if (!activeWin) return; // Not loaded yet
      const window = await activeWin();

      if (!window) {
        // No active window (desktop, lock screen, etc.)
        if (this.currentApp) {
          this.saveAppUsage();
          this.currentApp = null;
          this.currentAppStartTime = null;
        }
        return;
      }

      const appName = this.normalizeAppName(window.owner.name);

      // Check if app changed
      if (appName !== this.currentApp) {
        // Save previous app usage
        if (this.currentApp) {
          this.saveAppUsage();
          this.appSwitchCount++;
        }

        // Check for interruptions during focus sessions
        this.checkFocusInterruption(appName);

        // Start tracking new app
        this.currentApp = appName;
        this.currentAppStartTime = Date.now();

        console.log(`[WindowTracker] Switched to: ${appName}`);
      }
    } catch (error) {
      // active-win may fail on some systems or during certain states
      console.warn('[WindowTracker] Error detecting active window:', error.message);
    }
  }

  /**
   * Check if switching to this app is an interruption during a focus session
   * @param {string} appName - App being switched to
   */
  checkFocusInterruption(appName) {
    try {
      const activeSession = queries.getActiveFocusSession();

      if (!activeSession) return; // No active focus session

      // Get app category
      const categories = queries.getAppCategories();
      const appCategory = categories.find(c => c.app_name === appName);
      const category = appCategory ? appCategory.category : 'neutral';

      // Only record as interruption if switching to distracting app
      if (category === 'distracting') {
        queries.recordInterruption({
          sessionId: activeSession.id,
          interruptionType: 'app_switch',
          appName: appName,
          durationSeconds: 0, // Will be updated when switching back
        });

        console.log(`[WindowTracker] Focus interruption: ${appName}`);
      }
    } catch (error) {
      console.warn('[WindowTracker] Error checking focus interruption:', error.message);
    }
  }

  /**
   * Normalize app name (remove version numbers, etc.)
   * @param {string} rawName - Raw app name from active-win
   * @returns {string} - Normalized name
   */
  normalizeAppName(rawName) {
    if (!rawName) return 'Unknown';

    // Remove common suffixes
    let normalized = rawName
      .replace(/\.exe$/i, '')
      .replace(/\s+v?\d+(\.\d+)*$/i, '') // Remove version numbers
      .trim();

    // Handle common variations
    const nameMap = {
      'chrome': 'Google Chrome',
      'firefox': 'Mozilla Firefox',
      'msedge': 'Microsoft Edge',
      'brave': 'Brave Browser',
      'code': 'Visual Studio Code',
      'cmd': 'Command Prompt',
      'powershell': 'PowerShell',
      'wt': 'Windows Terminal',
    };

    const lowerName = normalized.toLowerCase();
    if (nameMap[lowerName]) {
      return nameMap[lowerName];
    }

    return normalized;
  }

  /**
   * Save current app usage to database
   */
  saveAppUsage() {
    if (!this.currentApp || !this.currentAppStartTime) return;

    const duration = Math.floor((Date.now() - this.currentAppStartTime) / 1000); // seconds

    // Only save if usage was at least 1 second
    if (duration < 1) return;

    try {
      queries.insertAppUsage({
        appName: this.currentApp,
        duration,
        sessionId: this.sessionId,
      });

      console.log(`[WindowTracker] Saved ${this.currentApp}: ${duration}s`);
    } catch (error) {
      console.error('[WindowTracker] Error saving app usage:', error);
    }
  }

  /**
   * Initialize default app categories in database
   */
  async initializeCategories() {
    try {
      for (const [appName, category] of Object.entries(DEFAULT_CATEGORIES)) {
        queries.setAppCategory(appName, category);
      }
      console.log('[WindowTracker] Initialized default categories');
    } catch (error) {
      console.warn('[WindowTracker] Error initializing categories:', error.message);
    }
  }

  /**
   * Get app switch count
   * @returns {number}
   */
  getAppSwitchCount() {
    return this.appSwitchCount;
  }

  /**
   * Reset counters
   */
  resetCounters() {
    this.appSwitchCount = 0;
  }

  /**
   * Get status
   * @returns {object}
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentApp: this.currentApp,
      appSwitchCount: this.appSwitchCount,
    };
  }
}

module.exports = new WindowTracker();
