// FlowState - Active Application Window Tracker
// Tracks which application is in focus (NOT content)

class WindowTracker {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.currentApp = null;
        this.appSwitchCount = 0;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // TODO: Integrate with active-win package for cross-platform window tracking
        // const activeWin = require('active-win');
        //
        // this.intervalId = setInterval(async () => {
        //   const win = await activeWin();
        //   if (win && win.owner.name !== this.currentApp) {
        //     this.appSwitchCount++;
        //     this.currentApp = win.owner.name;
        //   }
        // }, 5000);

        console.log('[WindowTracker] Started');
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('[WindowTracker] Stopped');
    }

    getCurrentApp() {
        return this.currentApp;
    }

    getAppSwitchCount() {
        return this.appSwitchCount;
    }

    resetCounters() {
        this.appSwitchCount = 0;
    }
}

module.exports = new WindowTracker();
