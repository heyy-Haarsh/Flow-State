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

        // EMA-smoothed metrics (survive across flush cycles)
        // These provide stable, gradually-changing values instead of
        // raw snapshots that swing wildly (e.g., 180→0 when you stop typing).
        this._smoothedTypingSpeed = 0;
        this._smoothedErrorRate = 0;
        this._emaAlpha = 0.3;  // Higher = more reactive, Lower = smoother
        this._lastActivityTime = Date.now();
        this._idleDecayStarted = false;

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

        // Calculate raw metrics for this interval
        let rawTypingSpeed = 0;
        let rawErrorRate = 0;

        if (elapsedMin >= 0.1 && this.keystrokeCount > 0) {
            rawTypingSpeed = Math.round(this.keystrokeCount / elapsedMin);
            const totalErrors = this.backspaceCount + this.deleteCount;
            rawErrorRate = +(totalErrors / this.keystrokeCount).toFixed(4);
        }

        // Update EMA-smoothed values
        // When idle (no keystrokes), blend toward 0 but slowly
        if (this.keystrokeCount === 0) {
            // Idle decay: use a gentler alpha so speed doesn't crash to 0 instantly
            const idleDurationSec = (Date.now() - this._lastActivityTime) / 1000;
            // After 30s idle, start decaying. After 5min idle, decay faster.
            const idleDecayAlpha = idleDurationSec > 300 ? 0.3 :
                idleDurationSec > 60 ? 0.15 : 0.05;
            this._smoothedTypingSpeed *= (1 - idleDecayAlpha);
            // Error rate holds steady during idle (it shouldn't change)
        } else {
            // Active: blend new reading into the EMA
            this._smoothedTypingSpeed =
                this._emaAlpha * rawTypingSpeed +
                (1 - this._emaAlpha) * this._smoothedTypingSpeed;
            this._smoothedErrorRate =
                this._emaAlpha * rawErrorRate +
                (1 - this._emaAlpha) * this._smoothedErrorRate;
            this._lastActivityTime = Date.now();
        }

        // Only save to DB if there was actual activity
        if (this.keystrokeCount > 0) {
            try {
                // Save the SMOOTHED values to DB (not raw), so that
                // the feature extractor reads stable values
                insertActivityEvent('typing_speed', Math.round(this._smoothedTypingSpeed), this.sessionId);
                insertActivityEvent('error_rate', +this._smoothedErrorRate.toFixed(4), this.sessionId);

                console.log(
                    `[KeyboardMonitor] Flushed: raw=${rawTypingSpeed} kpm, smoothed=${Math.round(this._smoothedTypingSpeed)} kpm, errors=${(this._smoothedErrorRate * 100).toFixed(1)}%`
                );
            } catch (err) {
                console.error('[KeyboardMonitor] Error saving metrics:', err.message);
            }
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

        // Calculate instantaneous speed for this interval
        let instantSpeed = 0;
        let instantErrorRate = 0;
        if (elapsedMin >= 0.05 && this.keystrokeCount > 0) {
            instantSpeed = Math.round(this.keystrokeCount / elapsedMin);
            instantErrorRate = +((this.backspaceCount + this.deleteCount) / this.keystrokeCount).toFixed(4);
            this._lastActivityTime = Date.now();
        }

        // Blend instantaneous reading into the EMA
        if (instantSpeed > 0) {
            this._smoothedTypingSpeed =
                this._emaAlpha * instantSpeed +
                (1 - this._emaAlpha) * this._smoothedTypingSpeed;
            this._smoothedErrorRate =
                this._emaAlpha * instantErrorRate +
                (1 - this._emaAlpha) * this._smoothedErrorRate;
        } else {
            // Idle: gentle decay instead of hard drop to 0
            const idleSec = (Date.now() - this._lastActivityTime) / 1000;
            if (idleSec > 30) {
                const decayFactor = idleSec > 300 ? 0.95 : 0.98;
                this._smoothedTypingSpeed *= decayFactor;
            }
            // Error rate holds during idle
        }

        return {
            typingSpeed: Math.round(this._smoothedTypingSpeed),
            errorRate: +this._smoothedErrorRate.toFixed(4),
        };
    }
}

module.exports = new KeyboardMonitor();
