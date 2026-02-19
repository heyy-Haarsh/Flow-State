// Quick database query script
const Database = require('better-sqlite3');
const db = new Database('C:/Users/hp/AppData/Roaming/flowstate/flowstate.db');

console.log('=== DATABASE CONTENTS ===\n');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get().count;
  console.log(`📊 ${t.name}: ${count} records`);
});

console.log('\n=== FOCUS SESSIONS ===');
const sessions = db.prepare('SELECT * FROM focus_sessions ORDER BY start_time DESC LIMIT 5').all();
console.log(JSON.stringify(sessions, null, 2));

console.log('\n=== TASKS ===');
const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5').all();
console.log(JSON.stringify(tasks, null, 2));

console.log('\n=== ACTIVITY EVENTS (Last 10) ===');
const events = db.prepare('SELECT * FROM activity_events ORDER BY timestamp DESC LIMIT 10').all();
console.log(JSON.stringify(events, null, 2));

console.log('\n=== HOURLY METRICS ===');
const metrics = db.prepare('SELECT * FROM metrics_hourly ORDER BY hour_start DESC LIMIT 3').all();
console.log(JSON.stringify(metrics, null, 2));

console.log('\n=== APP USAGE ===');
const appUsage = db.prepare('SELECT * FROM app_usage ORDER BY timestamp DESC LIMIT 5').all();
console.log(JSON.stringify(appUsage, null, 2));

db.close();
console.log('\n✅ Database query complete!');
