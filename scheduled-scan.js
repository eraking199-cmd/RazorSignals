// Runs exactly one RazorSignals scan.
// GitHub Actions starts this file on schedule and exits when the scan finishes.

require('dotenv').config();

const scanner = require('./src/scanner');
const { initTelegramSender, broadcast } = require('./src/bot');

const {
  formatSetupMessage,
  formatWeekendMessage,
  formatMarketActiveMessage,
} = require('./src/utils/format');

async function main() {
  console.log('🚀 Starting scheduled RazorSignals scan...');

  // Initialize Telegram without starting polling.
  initTelegramSender();

  // Connect scanner events to Telegram broadcasts.
  scanner.setCallbacks({
    onSetup: async (setup) => {
      await broadcast(formatSetupMessage(setup));
    },

    onWeekend: async () => {
      await broadcast(formatWeekendMessage());
    },

    onMarketActive: async () => {
      await broadcast(formatMarketActiveMessage());
    },
  });

  // Run exactly ONE scan.
  await scanner.runScan();

  console.log('✅ Scheduled RazorSignals scan finished.');
}

main().catch((err) => {
  console.error('❌ Scheduled scan failed:', err.message);
  process.exit(1);
});
