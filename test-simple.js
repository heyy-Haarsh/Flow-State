try {
    console.log('Testing better-sqlite3...');
    require('better-sqlite3');
    console.log('✅ better-sqlite3 OK');
} catch (e) {
    console.error('❌ better-sqlite3 FAIL:', e.message);
}

try {
    console.log('Testing migrations...');
    require('./main/database/migrations');
    console.log('✅ migrations OK');
} catch (e) {
    console.error('❌ migrations FAIL:', e.message);
}

try {
    console.log('Testing PeakDetector...');
    require('./main/services/peak-detector');
    console.log('✅ PeakDetector OK');
} catch (e) {
    console.error('❌ PeakDetector FAIL:', e.message);
}
