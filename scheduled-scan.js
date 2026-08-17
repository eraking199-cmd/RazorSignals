// Runs exactly one RazorSignals scan.
// GitHub Actions starts this file on schedule and exits when the scan finishes.

require('dotenv').config();

const scanner = require('./src/scanner');
const { broadcast } = require('./src/bot');

async function main() {
  console.log('🚀 Starting scheduled RazorSignals scan...');

  scanner.setCallbacks({
    onSetup: async (setup) => {
      const {
        formatSetupMessage,
        formatWeekendMessage,
        formatMarketActiveMessage,
      } = require('./src/utils/format');

      await broadcast(formatSetupMessage(setup));
    },

    onWeekend: async () => {
      const { formatWeekendMessage } = require('./src/utils/format');
      await broadcast(formatWeekendMessage());
    },

    onMarketActive: async () => {
      const { formatMarketActiveMessage } = require('./src/utils/format');
      await broadcast(formatMarketActiveMessage());
    },
  });

  await scanner.runScan();

  console.log('✅ Scheduled RazorSignals scan finished.');
}

main().catch((err) => {
  console.error('❌ Scheduled scan failed:', err.message);
  process.exit(1);
});
