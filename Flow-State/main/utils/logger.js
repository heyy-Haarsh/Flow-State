// FlowState - Logger Utility
// Simple logging with levels and file output

const path = require('path');
const fs = require('fs');

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let currentLevel = LOG_LEVELS.INFO;

function setLogLevel(level) {
    currentLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
}

function formatMessage(level, module, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${module}] ${message}`;
}

function log(level, module, message, ...args) {
    if (LOG_LEVELS[level] < currentLevel) return;

    const formatted = formatMessage(level, module, message);

    switch (level) {
        case 'ERROR':
            console.error(formatted, ...args);
            break;
        case 'WARN':
            console.warn(formatted, ...args);
            break;
        case 'DEBUG':
            console.debug(formatted, ...args);
            break;
        default:
            console.log(formatted, ...args);
    }
}

module.exports = {
    setLogLevel,
    debug: (module, msg, ...args) => log('DEBUG', module, msg, ...args),
    info: (module, msg, ...args) => log('INFO', module, msg, ...args),
    warn: (module, msg, ...args) => log('WARN', module, msg, ...args),
    error: (module, msg, ...args) => log('ERROR', module, msg, ...args),
};
