// Entry point for RazorSignals.
// Starts the Telegram bot, which in turn manages the research scanner.
//
// Run with: node index.js
// Make sure your .env file is configured first (see README).

const { startBot } = require('./src/bot');

try {
  startBot();
} catch (err) {
  console.error('Failed to start RazorSignals:', err.message);
  process.exit(1);
}
