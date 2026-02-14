const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

class TrayManager {
  constructor() {
    this.tray = null;
    this.mainWindow = null;
    this.currentEnergyScore = 70;
  }

  /**
   * Initialize the system tray icon
   * @param {BrowserWindow} mainWindow - Reference to main window for show/hide
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;

    // Create initial tray icon
    const icon = this.generateIcon(this.currentEnergyScore);
    this.tray = new Tray(icon);

    // Set initial tooltip
    this.updateTooltip(this.currentEnergyScore);

    // Build context menu
    this.updateContextMenu();

    // Handle tray icon click (Windows/Linux: show window, macOS: show menu)
    this.tray.on('click', () => {
      if (process.platform !== 'darwin') {
        this.toggleWindow();
      }
    });

    console.log('[TrayManager] Initialized successfully');
  }

  /**
   * Generate a colored icon based on energy score
   * @param {number} energyScore - Energy score (0-100)
   * @returns {NativeImage} - Generated icon
   */
  generateIcon(energyScore) {
    // Determine color based on energy thresholds
    let colorHex;
    if (energyScore >= 80) {
      colorHex = '#10b981'; // Green (peak)
    } else if (energyScore >= 60) {
      colorHex = '#3b82f6'; // Blue (good)
    } else if (energyScore >= 40) {
      colorHex = '#f59e0b'; // Amber (low)
    } else {
      colorHex = '#ef4444'; // Red (critical)
    }

    // Create a 16x16 bitmap buffer (RGBA format)
    const size = 16;
    const buffer = this.createBitmapBuffer(size, colorHex);

    // Create native image from buffer
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  /**
   * Create a simple colored circle bitmap buffer
   * @param {number} size - Icon size
   * @param {string} colorHex - Hex color
   * @returns {Buffer} - RGBA bitmap buffer
   */
  createBitmapBuffer(size, colorHex) {
    // Parse hex color
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);

    // Create RGBA buffer
    const buffer = Buffer.alloc(size * size * 4);
    const center = size / 2;
    const radius = size / 2 - 1;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        const distance = Math.sqrt((x - center) ** 2 + (y - center) ** 2);

        if (distance <= radius) {
          // Inside circle - colored
          buffer[index] = r;     // R
          buffer[index + 1] = g; // G
          buffer[index + 2] = b; // B
          buffer[index + 3] = 255; // A (opaque)
        } else {
          // Outside circle - transparent
          buffer[index] = 0;
          buffer[index + 1] = 0;
          buffer[index + 2] = 0;
          buffer[index + 3] = 0;
        }
      }
    }

    return buffer;
  }

  /**
   * Update tray icon based on energy score
   * @param {number} energyScore - Energy score (0-100)
   */
  updateIcon(energyScore) {
    if (!this.tray) return;

    this.currentEnergyScore = energyScore;
    const icon = this.generateIcon(energyScore);
    this.tray.setImage(icon);
    this.updateTooltip(energyScore);
  }

  /**
   * Update tooltip text
   * @param {number} energyScore - Energy score (0-100)
   */
  updateTooltip(energyScore) {
    if (!this.tray) return;

    let status;
    if (energyScore >= 80) status = 'Peak';
    else if (energyScore >= 60) status = 'Good';
    else if (energyScore >= 40) status = 'Low';
    else status = 'Critical';

    this.tray.setToolTip(`FlowState - Energy: ${Math.round(energyScore)} (${status})`);
  }

  /**
   * Build and update context menu
   * @param {object} options - Optional menu customization
   */
  updateContextMenu(options = {}) {
    if (!this.tray) return;

    const { focusSessionActive = false, focusTimeRemaining = null } = options;

    const menuTemplate = [
      {
        label: `Energy Score: ${Math.round(this.currentEnergyScore)}`,
        enabled: false,
      },
      { type: 'separator' },
    ];

    // Focus session status (if active)
    if (focusSessionActive && focusTimeRemaining) {
      menuTemplate.push({
        label: `In Focus — ${focusTimeRemaining} remaining`,
        enabled: false,
      });
      menuTemplate.push({ type: 'separator' });
    }

    // Quick actions
    menuTemplate.push(
      {
        label: 'Show Dashboard',
        click: () => this.showWindow(),
      },
      {
        label: 'Start Focus Session',
        click: () => {
          this.showWindow();
          this.mainWindow?.webContents.send('navigate-to', 'focus');
        },
        enabled: !focusSessionActive,
      },
      {
        label: 'Take a Break',
        click: () => {
          this.mainWindow?.webContents.send('trigger-break');
        },
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.showWindow();
          this.mainWindow?.webContents.send('navigate-to', 'settings');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit FlowState',
        click: () => {
          app.quit();
        },
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Show the main window
   */
  showWindow() {
    if (!this.mainWindow) return;

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }

    this.mainWindow.show();
    this.mainWindow.focus();
  }

  /**
   * Toggle window visibility
   */
  toggleWindow() {
    if (!this.mainWindow) return;

    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  /**
   * Cleanup tray on app quit
   */
  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      console.log('[TrayManager] Destroyed');
    }
  }
}

// Export singleton instance
module.exports = new TrayManager();
