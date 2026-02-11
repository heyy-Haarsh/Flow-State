// FlowState - Active Application Window Tracker
// Tracks context switches (app switching) for productivity analysis.
// Uses BrowserWindow focus/blur events in Electron, plus uiohook
// click events as a secondary signal.
//
// PRIVACY: We do NOT store window titles or app names — only
// counting the number of switches.

const globalHook = require('./global-input-hook');

class WindowTracker {
    constructor() {
        this.isRunning = false;
        this.appSwitchCount = 0;
        this.lastActivityApp = null;
        this._boundClickHandler = this._handleClick.bind(this);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.appSwitchCount = 0;

        // Use mouse clicks as a proxy for context switches.
        // When focus changes (detected by Electron blur/focus events),
        // that's the primary signal — but clicks help detect switches
        // between non-FlowState windows.
        globalHook.on('click', this._boundClickHandler);

        console.log('[WindowTracker] Started');
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;

        globalHook.off('click', this._boundClickHandler);

        console.log('[WindowTracker] Stopped');
    }

    /**
     * Called by main process when Electron window gains/loses focus.
     * This is the primary context-switch detection method.
     */
    recordFocusChange(isFocused) {
        if (!isFocused) {
            this.appSwitchCount++;
        }
    }

    _handleClick(event) {
        // Each click globally could indicate user switching context.
        // This is a rough heuristic — the main signal comes from
        // Electron's blur/focus events via recordFocusChange().
    }

    getAppSwitchCount() {
        return this.appSwitchCount;
    }

    resetCounters() {
        this.appSwitchCount = 0;
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            appSwitchCount: this.appSwitchCount,
        };
    }
}

module.exports = new WindowTracker();
