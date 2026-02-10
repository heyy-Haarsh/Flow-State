// FlowState - Global Mouse Monitor
// Tracks mouse entropy (movement smoothness) and idle detection

const { insertActivityEvent } = require('../database/queries');

class MouseMonitor {
    constructor() {
        this.moveEvents = [];
        this.lastMoveTime = null;
        this.idleStartTime = null;
        this.totalIdleMs = 0;
        this.sessionId = null;
        this.isRunning = false;
        this.intervalId = null;
        this.IDLE_THRESHOLD_MS = 30000; // 30 seconds of no movement = idle
    }

    start(sessionId) {
        if (this.isRunning) return;

        this.sessionId = sessionId;
        this.isRunning = true;
        this.moveEvents = [];
        this.lastMoveTime = Date.now();
        this.idleStartTime = null;
        this.totalIdleMs = 0;

        // TODO: Replace with iohook or native module for global mouse hooks
        // iohook.on('mousemove', this._handleMouseMove.bind(this));

        // Flush metrics every 60 seconds
        this.intervalId = setInterval(() => {
            this._flushMetrics();
        }, 60000);

        console.log('[MouseMonitor] Started');
    }

    stop() {
        if (!this.isRunning) return;

        this._flushMetrics();
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('[MouseMonitor] Stopped');
    }

    _handleMouseMove(event) {
        if (!this.isRunning) return;

        const now = Date.now();

        // Track idle time
        if (this.lastMoveTime && now - this.lastMoveTime > this.IDLE_THRESHOLD_MS) {
            this.totalIdleMs += now - this.lastMoveTime;
        }

        // Store movement delta (NOT exact coordinates - privacy)
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
            this.moveEvents.push({ x: event.x, y: event.y, time: now, distance: 0, speed: 0 });
        }

        this.lastMoveTime = now;

        // Keep only last 100 events to prevent memory issues
        if (this.moveEvents.length > 100) {
            this.moveEvents = this.moveEvents.slice(-100);
        }
    }

    _calculateEntropy() {
        if (this.moveEvents.length < 5) return 0.5; // Default

        const speeds = this.moveEvents.map((e) => e.speed).filter((s) => s > 0);
        if (speeds.length < 2) return 0.5;

        // Calculate coefficient of variation (smoothness measure)
        const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const variance =
            speeds.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / speeds.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 0;

        // Normalize to 0-1 (lower CV = smoother = higher score)
        return Math.max(0, Math.min(1, 1 - cv));
    }

    _flushMetrics() {
        const elapsed = Date.now() - (this.lastMoveTime || Date.now());
        const entropy = this._calculateEntropy();
        const elapsedTotal = 60000; // 1 minute window
        const idlePercentage = Math.min(1, this.totalIdleMs / elapsedTotal);

        insertActivityEvent('mouse_entropy', entropy, this.sessionId);
        insertActivityEvent('idle_percentage', idlePercentage, this.sessionId);

        // Reset
        this.moveEvents = [];
        this.totalIdleMs = 0;
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            moveEventCount: this.moveEvents.length,
            currentEntropy: this._calculateEntropy(),
            sessionId: this.sessionId,
        };
    }
}

module.exports = new MouseMonitor();
