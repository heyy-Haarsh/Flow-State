const { Notification } = require('electron');

class NotificationManager {
  constructor() {
    this.mainWindow = null;
    this.notificationSettings = {
      enabled: true,
      breakReminders: true,
      taskSuggestions: true,
      flowAlerts: true,
    };
  }

  /**
   * Initialize notification manager with main window reference
   * @param {BrowserWindow} mainWindow - Main window instance
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;
    console.log('[NotificationManager] Initialized');
  }

  /**
   * Update notification settings
   * @param {object} settings - Notification preferences
   */
  updateSettings(settings) {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
  }

  /**
   * Show a notification for an intervention
   * @param {object} intervention - Intervention data
   * @returns {Notification|null} - Notification instance or null if disabled
   */
  showIntervention(intervention) {
    if (!this.notificationSettings.enabled) {
      return null;
    }

    const { type, title, body, urgency, navigateTo } = this.mapIntervention(intervention);

    // Check if this type of notification is enabled
    if (!this.shouldShowNotification(type)) {
      return null;
    }

    // Create notification
    const notification = new Notification({
      title,
      body,
      urgency: urgency || 'normal',
      silent: urgency === 'low',
      timeoutType: urgency === 'critical' ? 'never' : 'default',
    });

    // Handle click - bring window to focus and navigate
    notification.on('click', () => {
      this.handleNotificationClick(navigateTo);
    });

    notification.show();
    console.log(`[NotificationManager] Showed ${type} notification: ${title}`);

    return notification;
  }

  /**
   * Map intervention to notification config
   * @param {object} intervention - Raw intervention data
   * @returns {object} - Notification configuration
   */
  mapIntervention(intervention) {
    const { type, data } = intervention;

    switch (type) {
      case 'break_suggestion':
        return {
          type: 'break',
          title: '💤 Time for a Break',
          body: data?.message || 'Your energy is low. Taking a 5-minute break can help you recharge.',
          urgency: data?.energyScore < 30 ? 'critical' : 'normal',
          navigateTo: 'dashboard',
        };

      case 'task_switch':
        return {
          type: 'task',
          title: '🔄 Consider Switching Tasks',
          body: data?.message || 'Your current task might not match your energy level. Check suggested tasks.',
          urgency: 'low',
          navigateTo: 'tasks',
        };

      case 'flow_state':
        return {
          type: 'flow',
          title: '🎯 You\'re in Flow State!',
          body: 'Great focus detected. Minimize interruptions to maintain momentum.',
          urgency: 'low',
          navigateTo: 'dashboard',
        };

      case 'burnout_warning':
        return {
          type: 'break',
          title: '⚠️ Burnout Risk Detected',
          body: 'You\'ve been working intensely. Take a longer break to prevent burnout.',
          urgency: 'critical',
          navigateTo: 'dashboard',
        };

      case 'energy_peak':
        return {
          type: 'task',
          title: '⚡ Peak Energy Detected',
          body: 'Now is a great time to tackle your most challenging tasks!',
          urgency: 'low',
          navigateTo: 'tasks',
        };

      default:
        return {
          type: 'generic',
          title: 'FlowState',
          body: data?.message || 'You have a new notification',
          urgency: 'normal',
          navigateTo: 'dashboard',
        };
    }
  }

  /**
   * Check if notification type should be shown
   * @param {string} type - Notification type
   * @returns {boolean} - Should show
   */
  shouldShowNotification(type) {
    switch (type) {
      case 'break':
        return this.notificationSettings.breakReminders;
      case 'task':
        return this.notificationSettings.taskSuggestions;
      case 'flow':
        return this.notificationSettings.flowAlerts;
      default:
        return true;
    }
  }

  /**
   * Handle notification click - bring window to focus and navigate
   * @param {string} page - Page to navigate to
   */
  handleNotificationClick(page) {
    if (!this.mainWindow) return;

    // Show and focus window
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }

    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show();
    }

    this.mainWindow.focus();

    // Navigate to page
    if (page) {
      this.mainWindow.webContents.send('navigate-to', page);
    }

    console.log(`[NotificationManager] Clicked notification, navigated to: ${page}`);
  }

  /**
   * Show a simple notification (non-intervention)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} options - Additional options
   */
  show(title, body, options = {}) {
    if (!this.notificationSettings.enabled) {
      return null;
    }

    const notification = new Notification({
      title,
      body,
      urgency: options.urgency || 'normal',
      silent: options.silent || false,
    });

    if (options.onClick) {
      notification.on('click', options.onClick);
    }

    notification.show();
    return notification;
  }

  /**
   * Test notification (for settings page)
   */
  showTest() {
    this.show(
      '🔔 FlowState Notifications',
      'Notifications are working! You\'ll receive alerts for breaks, task suggestions, and more.',
      { urgency: 'normal' }
    );
  }
}

// Export singleton instance
module.exports = new NotificationManager();
