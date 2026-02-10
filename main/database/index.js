// FlowState - SQLite Database Connection Setup
// Uses better-sqlite3 for embedded, zero-config database

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { runMigrations } = require('./migrations');

let db = null;

function getDatabase() {
    if (db) return db;

    const dbPath = path.join(app.getPath('userData'), 'flowstate.db');
    db = new Database(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run migrations on first connection
    runMigrations(db);

    return db;
}

function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = { getDatabase, closeDatabase };
