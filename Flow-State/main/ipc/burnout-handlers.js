/**
 * IPC Handlers for Burnout Analysis
 */

const { ipcMain } = require('electron');
const burnoutAnalyzer = require('../services/burnout-analyzer');

/**
 * Register all burnout-related IPC handlers
 */
function registerBurnoutHandlers() {
  // Get current burnout risk analysis
  ipcMain.handle('get-burnout-analysis', async () => {
    try {
      const analysis = await burnoutAnalyzer.analyzeBurnoutRisk();
      return analysis;
    } catch (error) {
      console.error('[IPC] Error getting burnout analysis:', error);
      return {
        status: 'error',
        message: error.message,
      };
    }
  });

  // Get burnout history (last N weeks)
  ipcMain.handle('get-burnout-history', async (event, weeks = 12) => {
    try {
      // This would fetch historical burnout scores
      return {
        status: 'success',
        history: [],
      };
    } catch (error) {
      console.error('[IPC] Error getting burnout history:', error);
      return {
        status: 'error',
        message: error.message,
      };
    }
  });

  console.log('[IPC] Burnout handlers registered');
}

module.exports = { registerBurnoutHandlers };
