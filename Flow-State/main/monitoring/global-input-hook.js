// FlowState - Global Input Hook (uiohook-napi)
// Single shared instance that captures keyboard & mouse events
// system-wide, even when FlowState is NOT the focused window.
//
// Privacy: We NEVER record what keys are pressed or screen coords.
// We only count keystrokes, track backspaces, and compute mouse
// movement entropy.

let uIOhook = null;
let UiohookKey = null;
let isRunning = false;

// Event listeners registered by monitors
const listeners = {
    keydown: [],
    keyup: [],
    mousemove: [],
    mousedown: [],
    click: [],
    wheel: [],
};

/**
 * Initialize the native hook — call once from main process.
 * Returns true if native hooks are available, false otherwise.
 */
function init() {
    try {
        const mod = require('uiohook-napi');
        uIOhook = mod.uIOhook;
        UiohookKey = mod.UiohookKey;
        console.log('[GlobalInputHook] uiohook-napi loaded successfully');
        return true;
    } catch (err) {
        console.warn('[GlobalInputHook] uiohook-napi not available:', err.message);
        console.warn('[GlobalInputHook] Global tracking disabled — in-app tracking only');
        return false;
    }
}

/**
 * Start listening for global input events.
 * Each event type is forwarded to all registered listeners.
 */
function start() {
    if (!uIOhook || isRunning) return false;

    // Wire up all event types
    uIOhook.on('keydown', (e) => {
        for (const fn of listeners.keydown) fn(e);
    });

    uIOhook.on('keyup', (e) => {
        for (const fn of listeners.keyup) fn(e);
    });

    uIOhook.on('mousemove', (e) => {
        for (const fn of listeners.mousemove) fn(e);
    });

    uIOhook.on('mousedown', (e) => {
        for (const fn of listeners.mousedown) fn(e);
    });

    uIOhook.on('click', (e) => {
        for (const fn of listeners.click) fn(e);
    });

    uIOhook.on('wheel', (e) => {
        for (const fn of listeners.wheel) fn(e);
    });

    uIOhook.start();
    isRunning = true;
    console.log('[GlobalInputHook] Global input hooks ACTIVE — tracking everywhere');
    return true;
}

/**
 * Stop global event listening.
 */
function stop() {
    if (!uIOhook || !isRunning) return;

    uIOhook.stop();
    isRunning = false;

    // Clear all listeners
    for (const key of Object.keys(listeners)) {
        listeners[key] = [];
    }

    console.log('[GlobalInputHook] Global input hooks stopped');
}

/**
 * Register a callback for a specific event type.
 * @param {'keydown'|'keyup'|'mousemove'|'mousedown'|'click'|'wheel'} event
 * @param {Function} callback
 */
function on(event, callback) {
    if (listeners[event]) {
        listeners[event].push(callback);
    }
}

/**
 * Remove a callback for a specific event type.
 */
function off(event, callback) {
    if (listeners[event]) {
        listeners[event] = listeners[event].filter((fn) => fn !== callback);
    }
}

function getStatus() {
    return {
        isAvailable: !!uIOhook,
        isRunning,
        listenerCounts: Object.fromEntries(
            Object.entries(listeners).map(([k, v]) => [k, v.length])
        ),
    };
}

function getUiohookKey() {
    return UiohookKey;
}

module.exports = { init, start, stop, on, off, getStatus, getUiohookKey };
