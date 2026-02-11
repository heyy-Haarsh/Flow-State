// FlowState - Global Keyboard Monitor
// Tracks typing speed and error rate GLOBALLY using uiohook-napi.
// Works even when FlowState is NOT the focused window.
//
// PRIVACY: We NEVER store the actual key pressed — only counting
// keystrokes and backspaces for speed & error-rate metrics.

const { insertActivityEvent } = require('../database/queries');
const globalHook = require('./global-input-hook');

class KeyboardMonitor {
    constructor() {
        this.keystrokeCount = 0;
        this.backspaceCount = 0;
        this.deleteCount = 0;
        this.startTime = Date.now();
        this.sessionId = null;
        this.isRunning = false;
        this.intervalId = null;

        // Bind handler so we can remove it later
        this._boundKeyDown = this._handleKeyDown.bind(this);
    }

    start(sessionId) {
        if (this.isRunning) return;

        this.sessionId = sessionId;
        this.isRunning = true;
        this.startTime = Date.now();
        this.keystrokeCount = 0;
        this.backspaceCount = 0;
        this.deleteCount = 0;

        // Register with the global input hook
        globalHook.on('keydown', this._boundKeyDown);

        // Flush metrics to database every 60 seconds
        this.intervalId = setInterval(() => {
            this._flushMetrics();
        }, 60000);

        console.log('[KeyboardMonitor] Started — tracking globally');
    }

    stop() {
        if (!this.isRunning) return;

        this._flushMetrics(); // Save remaining data
        this.isRunning = false;

        // Unregister from global hook
        globalHook.off('keydown', this._boundKeyDown);

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('[KeyboardMonitor] Stopped');
    }

    _handleKeyDown(event) {
        if (!this.isRunning) return;

        this.keystrokeCount++;

        // Detect Backspace (keycode 14) and Delete (keycode 3667)
        const UiohookKey = globalHook.getUiohookKey();
        if (UiohookKey) {
            if (event.keycode === UiohookKey.Backspace) {
                this.backspaceCount++;
            } else if (event.keycode === UiohookKey.Delete) {
                this.deleteCount++;
            }
        } else {
            // Fallback keycodes (raw uiohook values)
            if (event.keycode === 14) {
                this.backspaceCount++;
            } else if (event.keycode === 3667) {
                this.deleteCount++;
            }
        }

        // Privacy: We NEVER store the actual key pressed.
        // Only counting keystrokes, backspaces, and deletes.
    }

    _flushMetrics() {
        const elapsedMs = Date.now() - this.startTime;
        const elapsedMin = elapsedMs / 60000;

        // Skip if almost no time has passed or no keystrokes
        if (elapsedMin < 0.1 || this.keystrokeCount === 0) return;

        const typingSpeed = Math.round(this.keystrokeCount / elapsedMin);
        const totalErrors = this.backspaceCount + this.deleteCount;
        const errorRate =
            this.keystrokeCount > 0
                ? +(totalErrors / this.keystrokeCount).toFixed(4)
                : 0;

        // Save to database
        try {
            insertActivityEvent('typing_speed', typingSpeed, this.sessionId);
            insertActivityEvent('error_rate', errorRate, this.sessionId);

            console.log(
                `[KeyboardMonitor] Flushed: speed=${typingSpeed} kpm, errors=${(errorRate * 100).toFixed(1)}%, keystrokes=${this.keystrokeCount}`
            );
        } catch (err) {
            console.error('[KeyboardMonitor] Error saving metrics:', err.message);
        }

        // Reset counters for next interval
        this.keystrokeCount = 0;
        this.backspaceCount = 0;
        this.deleteCount = 0;
        this.startTime = Date.now();
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            currentKeystrokeCount: this.keystrokeCount,
            currentBackspaceCount: this.backspaceCount,
            currentDeleteCount: this.deleteCount,
            sessionId: this.sessionId,
        };
    }

    /**
     * Get live stats without flushing (for real-time UI updates).
     */
    getLiveStats() {
        const elapsedMs = Date.now() - this.startTime;
        const elapsedMin = elapsedMs / 60000;

        if (elapsedMin < 0.05 || this.keystrokeCount === 0) {
            return { typingSpeed: 0, errorRate: 0 };
        }

        return {
            typingSpeed: Math.round(this.keystrokeCount / elapsedMin),
            errorRate:
                this.keystrokeCount > 0
                    ? +((this.backspaceCount + this.deleteCount) / this.keystrokeCount).toFixed(4)
                    : 0,
        };
    }
}

module.exports = new KeyboardMonitor();
