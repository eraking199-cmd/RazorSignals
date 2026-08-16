// Central configuration for RazorSignals.
// Reads all secrets/thresholds from environment variables so nothing is hard-coded.
// Never log or expose the values of the secret keys defined here.

require('dotenv').config();

const config = {
  // Telegram bot token from the BotFather. Required.
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',

  // Chat ID to send scan results / weekend-mode messages to.
  // For a single user this is your own Telegram chat id.
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

  // Supabase credentials (pre-provisioned). Used for scan/setup persistence.
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // How often the scanner evaluates market data.
  scanIntervalMinutes: parseInt(process.env.SCAN_INTERVAL_MINUTES || '60', 10),

  // Minimum historical win rate (percentage) required to report a setup.
  // Only setups whose backtest meets this threshold are sent.
  minWinRate: parseFloat(process.env.MIN_WIN_RATE || '70'),

  // Minimum number of historical samples required to trust a backtest.
  minSamples: parseInt(process.env.MIN_SAMPLES || '30', 10),

  // Assets to monitor. XAUUSD is listed first so the scanner gives it priority.
  assets: [
    { symbol: 'XAUUSD', name: 'Gold',     pipSize: 0.1,   priority: 1 },
    { symbol: 'EURUSD', name: 'Euro',     pipSize: 0.0001, priority: 2 },
    { symbol: 'GBPUSD', name: 'Pound',    pipSize: 0.0001, priority: 2 },
    { symbol: 'USDJPY', name: 'Yen',      pipSize: 0.01,  priority: 2 },
    { symbol: 'AUDUSD', name: 'Aussie',   pipSize: 0.0001, priority: 3 },
    { symbol: 'USDCAD', name: 'Loonie',   pipSize: 0.0001, priority: 3 },
    { symbol: 'USDCHF', name: 'Swissy',   pipSize: 0.0001, priority: 3 },
    { symbol: 'NZDUSD', name: 'Kiwi',     pipSize: 0.0001, priority: 3 },
  ],

  // Backtest testing period description shown in messages.
  testingPeriod: process.env.TESTING_PERIOD || 'Jan 2018 – Dec 2024',
};

module.exports = config;
