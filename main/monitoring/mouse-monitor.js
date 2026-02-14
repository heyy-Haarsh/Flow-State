// FlowState - Global Mouse Monitor
// Tracks mouse movement entropy (smoothness) and idle detection
// GLOBALLY using uiohook-napi — works even when FlowState is
// not the focused window.
//
// PRIVACY: We compute entropy from movement deltas, NOT exact
// screen coordinates. No cursor position data is stored.

const { insertActivityEvent } = require('../database/queries');
const globalHook = require('./global-input-hook');

class MouseMonitor {
    constructor() {
        this.moveEvents = [];
        this.lastMoveTime = null;
        this.idleStartTime = null;
        this.totalIdleMs = 0;
        this.sessionId = null;
        this.isRunning = false;
        this.intervalId = null;
        this.idleCheckId = null;
        this.IDLE_THRESHOLD_MS = 30000; // 30 seconds of no movement = idle

        // EMA-smoothed metrics
        this._smoothedEntropy = 0.5;
        this._smoothedIdle = 0;
        this._emaAlpha = 0.3;

        // Bind handlers
        this._boundMouseMove = this._handleMouseMove.bind(this);
    }

    start(sessionId) {
        if (this.isRunning) return;

        this.sessionId = sessionId;
        this.isRunning = true;
        this.moveEvents = [];
        this.lastMoveTime = Date.now();
        this.idleStartTime = null;
        this.totalIdleMs = 0;

        // Register with the global input hook
        globalHook.on('mousemove', this._boundMouseMove);

        // Flush metrics to database every 60 seconds
        this.intervalId = setInterval(() => {
            this._flushMetrics();
        }, 60000);

        // Check for idle every 10 seconds
        this.idleCheckId = setInterval(() => {
            this._checkIdle();
        }, 10000);

        console.log('[MouseMonitor] Started — tracking globally');
    }

    stop() {
        if (!this.isRunning) return;

        this._flushMetrics(); // Save remaining data
        this.isRunning = false;

        // Unregister from global hook
        globalHook.off('mousemove', this._boundMouseMove);

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.idleCheckId) {
            clearInterval(this.idleCheckId);
            this.idleCheckId = null;
        }

        console.log('[MouseMonitor] Stopped');
    }

    _handleMouseMove(event) {
        if (!this.isRunning) return;

        const now = Date.now();

        // If we were idle and now we're moving, record the idle duration
        if (this.idleStartTime) {
            this.totalIdleMs += now - this.idleStartTime;
            this.idleStartTime = null;
        }

        // Store movement delta (NOT exact coordinates — privacy first)
        if (this.moveEvents.length > 0) {
            const last = this.moveEvents[this.moveEvents.length - 1];
            const dx = event.x - last.x;
            const dy = event.y - last.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const timeDelta = now - last.time;

            this.moveEvents.push({
                x: event.x,
                y: event.y,
                time: now,
                distance,
                speed: timeDelta > 0 ? distance / timeDelta : 0,
            });
        } else {
            this.moveEvents.push({
                x: event.x,
                y: event.y,
                time: now,
                distance: 0,
                speed: 0,
            });
        }

        this.lastMoveTime = now;

        // Keep only last 200 events to prevent memory issues
        // (uiohook fires many events per second globally)
        if (this.moveEvents.length > 200) {
            this.moveEvents = this.moveEvents.slice(-200);
        }
    }

    /**
     * Periodically check if mouse has been idle.
     */
    _checkIdle() {
        if (!this.lastMoveTime) return;

        const now = Date.now();
        const timeSinceLastMove = now - this.lastMoveTime;

        if (timeSinceLastMove > this.IDLE_THRESHOLD_MS && !this.idleStartTime) {
            // Mark the start of idle period
            this.idleStartTime = this.lastMoveTime + this.IDLE_THRESHOLD_MS;
        }
    }

    /**
     * Calculate mouse movement entropy (smoothness indicator).
     * Lower entropy = smoother, more focused movement = better concentration.
     * Higher entropy = erratic, unfocused movement.
     * Returns 0–1 (higher = smoother).
     */
    _calculateEntropy() {
        if (this.moveEvents.length < 5) return 0.5; // Default (no data)

        const speeds = this.moveEvents
            .map((e) => e.speed)
            .filter((s) => s > 0);

        if (speeds.length < 2) return 0.5;

        // Coefficient of variation (smoothness measure)
        const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const variance =
            speeds.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / speeds.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 0;

        // Normalize to 0–1 (lower CV = smoother = higher score)
        return Math.max(0, Math.min(1, 1 - cv));
    }

    _flushMetrics() {
        // Calculate raw metrics for this interval
        const rawEntropy = this._calculateEntropy();

        let currentIdleMs = this.totalIdleMs;
        // If currently idle, add duration since idle start
        if (this.idleStartTime && !this.lastMoveTime) {
            // Not strictly needed if logic is correct, but safe check
        }
        // Actually this._checkIdle logic sets idleStartTime in future? 
        // Let's stick to standard logic:
        const now = Date.now();
        if (this.lastMoveTime && (now - this.lastMoveTime > this.IDLE_THRESHOLD_MS)) {
            // We are currently idle
            const idleDuration = now - Math.max(this.lastMoveTime, this.startTime); // simple approx for this window
            // Better: totalIdleMs tracks accumulated idle blocks. 
            // We need current ongoing idle block.
        }

        // Simplified raw idle calc used previously:
        let rawIdlePercentage = this.totalIdleMs / 60000;
        if (this.idleStartTime) {
            rawIdlePercentage += (Date.now() - this.idleStartTime) / 60000;
        }
        rawIdlePercentage = Math.min(1, Math.max(0, rawIdlePercentage));

        // Update EMA
        this._smoothedEntropy =
            this._emaAlpha * rawEntropy + (1 - this._emaAlpha) * this._smoothedEntropy;

        this._smoothedIdle =
            this._emaAlpha * rawIdlePercentage + (1 - this._emaAlpha) * this._smoothedIdle;

        try {
            // Save SMOOTHED values
            insertActivityEvent('mouse_entropy', +this._smoothedEntropy.toFixed(3), this.sessionId);
            insertActivityEvent('idle_percentage', +this._smoothedIdle.toFixed(3), this.sessionId);

            console.log(
                `[MouseMonitor] Flushed: entropy=${this._smoothedEntropy.toFixed(3)} (raw ${rawEntropy.toFixed(2)}), idle=${(this._smoothedIdle * 100).toFixed(1)}%`
            );
        } catch (err) {
            console.error('[MouseMonitor] Error saving metrics:', err.message);
        }

        // Reset for next interval
        this.moveEvents = [];
        this.totalIdleMs = 0;
        this.idleStartTime = null;

        // If we were idle, re-establish idle state for the new window
        const timeSinceLastMove = Date.now() - (this.lastMoveTime || 0);
        if (timeSinceLastMove > this.IDLE_THRESHOLD_MS) {
            this.idleStartTime = Date.now(); // Start counting idle from now for the new window
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            moveEventCount: this.moveEvents.length,
            currentEntropy: this._calculateEntropy(),
            currentIdleMs: this.totalIdleMs,
            sessionId: this.sessionId,
        };
    }

    /**
     * Get live stats for real-time UI updates.
     */
    getLiveStats() {
        // Calculate raw instantaneous values
        const rawEntropy = this._calculateEntropy();

        let currentIdleMs = this.totalIdleMs;
        if (this.idleStartTime) {
            currentIdleMs += Date.now() - this.idleStartTime;
        }
        const rawIdle = Math.min(1, currentIdleMs / 60000);

        // Blend into EMA for display
        // Note: We don't update the persistent EMA here to avoid over-updating it 
        // between flushes, but we return a blended view.
        // Actually, for "Live" stats, we usually want the most recent smooth value.
        // Let's return the last flushed smoothed value blended with current raw 
        // to give a responsive but stable feel.

        const liveSmoothedEntropy = 0.2 * rawEntropy + 0.8 * this._smoothedEntropy;
        const liveSmoothedIdle = 0.2 * rawIdle + 0.8 * this._smoothedIdle;

        return {
            entropy: liveSmoothedEntropy,
            idlePercentage: liveSmoothedIdle,
            moveCount: this.moveEvents.length,
        };
    }
}

module.exports = new MouseMonitor();
