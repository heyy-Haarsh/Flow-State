// FlowState - Global Keyboard Monitor
// Tracks typing speed and error rate (NEVER keystroke content)

const { insertActivityEvent } = require('../database/queries');

class KeyboardMonitor {
    constructor() {
        this.keystrokeCount = 0;
        this.backspaceCount = 0;
        this.startTime = Date.now();
        this.sessionId = null;
        this.isRunning = false;
        this.intervalId = null;
    }

    start(sessionId) {
        if (this.isRunning) return;

        this.sessionId = sessionId;
        this.isRunning = true;
        this.startTime = Date.now();
        this.keystrokeCount = 0;
        this.backspaceCount = 0;

        // TODO: Replace with iohook or native module for global keyboard hooks
        // For now, using a placeholder that will be replaced with actual implementation
        // iohook.on('keydown', this._handleKeyDown.bind(this));
        // iohook.start();

        // Flush metrics every 60 seconds
        this.intervalId = setInterval(() => {
            this._flushMetrics();
        }, 60000);

        console.log('[KeyboardMonitor] Started');
    }

    stop() {
        if (!this.isRunning) return;

        this._flushMetrics(); // Save any remaining data
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // iohook.stop();
        console.log('[KeyboardMonitor] Stopped');
    }

    _handleKeyDown(event) {
        if (!this.isRunning) return;

        this.keystrokeCount++;

        // Backspace keycode = 14 (iohook) or 8 (standard)
        if (event.keycode === 14 || event.keycode === 8) {
            this.backspaceCount++;
        }

        // Privacy: We NEVER store the actual key pressed
        // Only counting keystrokes and backspaces
    }

    _flushMetrics() {
        const elapsed = (Date.now() - this.startTime) / 60000; // minutes
        if (elapsed < 0.1 || this.keystrokeCount === 0) return;

        const typingSpeed = Math.round(this.keystrokeCount / elapsed);
        const errorRate =
            this.keystrokeCount > 0
                ? +(this.backspaceCount / this.keystrokeCount).toFixed(4)
                : 0;

        // Save to database
        insertActivityEvent('typing_speed', typingSpeed, this.sessionId);
        insertActivityEvent('error_rate', errorRate, this.sessionId);

        // Reset counters
        this.keystrokeCount = 0;
        this.backspaceCount = 0;
        this.startTime = Date.now();
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            currentKeystrokeCount: this.keystrokeCount,
            currentBackspaceCount: this.backspaceCount,
            sessionId: this.sessionId,
        };
    }
}

module.exports = new KeyboardMonitor();
