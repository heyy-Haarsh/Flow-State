const path = require('path');

// --- 1. MOCK DEPENDENCIES ---

// Mock Electron (needed because PeakDetector might use something that imports it)
const mockElectron = {
    app: { getPath: () => './' }
};

// Mock Database Queries
const mockQueries = {
    getHourlyMetrics: (hours) => {
        // Generate 28 days of dummy data
        const data = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        for (let day = 0; day < 28; day++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + day);
            const isWeekend = (date.getDay() === 0 || date.getDay() === 6);

            for (let hour = 0; hour < 24; hour++) {
                const hourDate = new Date(date);
                hourDate.setHours(hour, 0, 0, 0);

                let speed = 40;
                let energy = 50;
                let tasks = 1;

                // Pattern: Weekday 10am-12pm PEAK
                if (!isWeekend && hour >= 10 && hour <= 12) {
                    speed = 90;
                    energy = 85;
                    tasks = 4;
                }

                // Pattern: Weekday 3pm CRASH
                if (!isWeekend && hour === 15) {
                    speed = 30;
                    energy = 30;
                    tasks = 0;
                }

                data.push({
                    hour_start: hourDate.toISOString(),
                    avg_typing_speed: speed,
                    avg_error_rate: 0.02,
                    mouse_entropy: 0.5,
                    idle_percentage: 0.1,
                    tasks_completed: tasks,
                    avg_energy_score: energy,
                    work_minutes: 60
                });
            }
        }
        return data; // Return raw rows
    },
    savePeakAnalysisResult: (result) => {
        // Store results in global verify list
        global.mockResults.push(result);
    },
    clearPeakAnalysisResults: () => { }
};

// --- 2. MONKEY PATCH REQUIRE ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
    if (request === 'electron') return mockElectron;
    if (request.includes('database/queries')) return mockQueries;
    return originalRequire.apply(this, arguments);
};

// --- 3. RUN TEST ---
global.mockResults = [];
const PeakDetector = require('./main/services/peak-detector');

async function runTest() {
    console.log('--- STARTING PEAK DETECTOR TEST (MOCKED) ---');

    const detector = new PeakDetector();
    await detector.runAnalysis();

    const peaks = global.mockResults;
    console.log(`Generated ${peaks.length} analysis rows.`);

    // Check Weekday 10 AM
    const weekday10 = peaks.find(p => p.context === 'weekday' && p.hourOfDay === 10);
    const weekday11 = peaks.find(p => p.context === 'weekday' && p.hourOfDay === 11);
    const weekday15 = peaks.find(p => p.context === 'weekday' && p.hourOfDay === 15);

    console.log('\n--- RESULTS CHECK ---');
    console.log('10 AM (Target: Peak):', weekday10 ? (weekday10.isPeak ? '✅ PEAK' : '❌ NOT PEAK') : 'MISSING', weekday10?.peakScore);
    console.log('11 AM (Target: Peak):', weekday11 ? (weekday11.isPeak ? '✅ PEAK' : '❌ NOT PEAK') : 'MISSING', weekday11?.peakScore);
    console.log('03 PM (Target: Low): ', weekday15 ? (!weekday15.isPeak ? '✅ OK' : '❌ FALSE POSITIVE') : 'MISSING', weekday15?.peakScore);

    // Check Window Clustering
    console.log('\n--- WINDOW CLUSTERING ---');
    const windows = peaks.filter(p => p.context === 'weekday' && p.isPeak);
    // 10 and 11 should share window ID
    if (weekday10 && weekday11 && weekday10.windowGroupId === weekday11.windowGroupId) {
        console.log('✅ 10 AM and 11 AM shared Window ID:', weekday10.windowGroupId);
    } else {
        console.log('❌ Clustering failed or IDs match mismatches.');
    }

    if (weekday10?.isPeak && !weekday15?.isPeak) {
        console.log('\n✅ TEST SUITE PASSED');
    } else {
        console.log('\n❌ TEST SUITE FAILED');
        process.exit(1);
    }
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
