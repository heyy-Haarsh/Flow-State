// FlowState - Global Tracking Test Script
// ==========================================
// Run: node test-global-tracking.js
//
// This script starts global keyboard & mouse tracking and
// shows live stats every 3 seconds. It works even when this
// terminal is NOT focused — type anywhere on your system
// and you'll see the numbers go up!

const globalHook = require('./main/monitoring/global-input-hook');

// Initialize
const available = globalHook.init();
if (!available) {
    console.error('uiohook-napi not available. Run: npm install uiohook-napi');
    process.exit(1);
}

// Tracking state
let keystrokeCount = 0;
let backspaceCount = 0;
let mouseMoveCount = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let startTime = Date.now();

// Get UiohookKey constants
const UiohookKey = globalHook.getUiohookKey();

// Register handlers
globalHook.on('keydown', (e) => {
    keystrokeCount++;
    if (UiohookKey && e.keycode === UiohookKey.Backspace) {
        backspaceCount++;
    }
});

globalHook.on('mousemove', (e) => {
    mouseMoveCount++;
    lastMouseX = e.x;
    lastMouseY = e.y;
});

// Start global hooks
globalHook.start();

console.log('');
console.log('=====================================================');
console.log('  FlowState Global Tracking Test');
console.log('=====================================================');
console.log('  Global hooks are ACTIVE!');
console.log('  - Type ANYWHERE on your system (not just here)');
console.log('  - Move your mouse around');
console.log('  - Stats update every 3 seconds');
console.log('  - Press Ctrl+C to stop');
console.log('=====================================================');
console.log('');

// Show live stats every 3 seconds
const interval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const typingSpeed = keystrokeCount > 0
        ? Math.round(keystrokeCount / ((Date.now() - startTime) / 60000))
        : 0;
    const errorRate = keystrokeCount > 0
        ? ((backspaceCount / keystrokeCount) * 100).toFixed(1)
        : '0.0';

    console.log(`[${elapsed}s] Keystrokes: ${keystrokeCount} | Speed: ${typingSpeed} kpm | Error rate: ${errorRate}% | Mouse moves: ${mouseMoveCount}`);
}, 3000);

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n--- Stopping global hooks ---');
    clearInterval(interval);
    globalHook.stop();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const typingSpeed = keystrokeCount > 0
        ? Math.round(keystrokeCount / ((Date.now() - startTime) / 60000))
        : 0;
    const errorRate = keystrokeCount > 0
        ? ((backspaceCount / keystrokeCount) * 100).toFixed(1)
        : '0.0';

    console.log('');
    console.log('=== FINAL SUMMARY ===');
    console.log(`Duration:        ${elapsed} seconds`);
    console.log(`Total keystrokes: ${keystrokeCount}`);
    console.log(`Backspaces:      ${backspaceCount}`);
    console.log(`Typing speed:    ${typingSpeed} keystrokes/min`);
    console.log(`Error rate:      ${errorRate}%`);
    console.log(`Mouse moves:     ${mouseMoveCount}`);
    console.log('=====================');

    process.exit(0);
});
