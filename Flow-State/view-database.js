// Quick script to view SQLite database contents
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(
  process.env.APPDATA || process.env.HOME,
  'flowstate',
  'flowstate.db'
);

console.log('\n📊 FlowState Database Viewer');
console.log('='.repeat(80));
console.log(`Database: ${dbPath}\n`);

try {
  const db = new Database(dbPath, { readonly: true });

  // Get all tables
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();

  console.log(`📁 Total Tables: ${tables.length}\n`);

  tables.forEach((table) => {
    const tableName = table.name;

    // Get row count
    const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    const count = countResult.count;

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📋 Table: ${tableName} (${count} records)`);
    console.log('─'.repeat(80));

    if (count > 0) {
      // Get first 10 rows
      const rows = db.prepare(`SELECT * FROM ${tableName} LIMIT 10`).all();

      if (rows.length > 0) {
        // Get column names
        const columns = Object.keys(rows[0]);

        // Print header
        console.log('\nColumns:', columns.join(', '));
        console.log('\nSample Data:');

        rows.forEach((row, idx) => {
          console.log(`\n  Row ${idx + 1}:`);
          columns.forEach((col) => {
            let value = row[col];
            if (value === null) value = 'NULL';
            if (typeof value === 'string' && value.length > 100) {
              value = value.substring(0, 100) + '...';
            }
            console.log(`    ${col}: ${value}`);
          });
        });

        if (count > 10) {
          console.log(`\n  ... and ${count - 10} more records`);
        }
      }
    } else {
      console.log('  (empty table)');
    }
  });

  db.close();

  console.log('\n' + '='.repeat(80));
  console.log('✅ Database query complete!\n');

} catch (error) {
  console.error('❌ Error reading database:', error.message);
  console.error('\nMake sure the FlowState app has created the database first.');
}
