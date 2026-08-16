// Telegram bot for RazorSignals.
//
// Handles the commands:
// /start
// /stop
// /status
// /help
// /testscan
//
// IMPORTANT: This bot is for research / paper-trading only.
// It never connects to MT5 or places real trades.

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const scanner = require('./scanner');

const {
  formatSetupMessage,
  formatWeekendMessage,
  formatMarketActiveMessage,
} = require('./utils/format');

let bot = null;

// Telegram users who have subscribed to scanner alerts.
// Chat IDs are kept in memory for now.
const subscribers = new Set();

// Initializes and starts the Telegram bot.
function startBot() {
  if (!config.telegramBotToken) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not set. Add it to your .env file (see README).'
    );
  }

  bot = new TelegramBot(config.telegramBotToken, {
    polling: true,
  });

  // Wire scanner callbacks to send Telegram messages
  // to every subscribed user.
  scanner.setCallbacks({
    onSetup: (setup) => broadcast(formatSetupMessage(setup)),
    onWeekend: () => broadcast(formatWeekendMessage()),
    onMarketActive: () => broadcast(formatMarketActiveMessage()),
  });

  // /start — subscribe this Telegram user to scanner alerts.
  bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;

    subscribers.add(chatId);

    // Start the scanner if it isn't already running.
    const started = scanner.start();

    reply(
      msg,
      started
        ? '✅ You are subscribed to RazorSignals alerts.\n\n' +
          '🟢 Research scanner enabled. Hourly scans are now running.\n\n' +
          'This is a paper-trading / research tool — no real trades are placed.'
        : '✅ You are subscribed to RazorSignals alerts.\n\n' +
          'ℹ️ Research scanner is already running.'
    );
  });

  // /stop — unsubscribe this Telegram user.
  bot.onText(/^\/stop$/, (msg) => {
    const chatId = msg.chat.id;

    const wasSubscribed = subscribers.delete(chatId);

    if (!wasSubscribed) {
      reply(
        msg,
        'ℹ️ You are not currently subscribed to scanner alerts.'
      );
      return;
    }

    // If nobody is subscribed anymore, stop the scanner.
    if (subscribers.size === 0) {
      scanner.stop();

      reply(
        msg,
        '⏹ You have been unsubscribed from RazorSignals alerts.\n\n' +
          'No subscribers remain, so the scanner has also stopped.'
      );
      return;
    }

    reply(
      msg,
      '⏹ You have been unsubscribed from RazorSignals alerts.\n\n' +
        'The scanner is still running for other subscribers.'
    );
  });

  // /status — show scanner status and subscriber count.
  bot.onText(/^\/status$/, (msg) => {
    const running = scanner.isRunning();
    const subscribed = subscribers.has(msg.chat.id);

    reply(
      msg,
      [
        running
          ? '🟢 Research scanner: RUNNING'
          : '🔴 Research scanner: STOPPED',
        '',
        subscribed
          ? '🔔 You are subscribed to alerts.'
          : '🔕 You are not subscribed to alerts.',
        '',
        `👥 Subscribers currently active: ${subscribers.size}`,
        '',
        running
          ? 'Hourly market scans are active.'
          : 'Use /start to enable alerts.',
      ].join('\n')
    );
  });

  // /testscan — run one scan immediately for testing.
  bot.onText(/^\/testscan$/, async (msg) => {
    reply(msg, '🧪 Running a test scan now...');

    try {
      await scanner.runScan();

      reply(
        msg,
        '✅ Test scan finished.\n\n' +
          'If a qualifying setup was found, it will be sent as a signal.\n' +
          'If the market is closed, you will see weekend mode instead.\n\n' +
          '⚠️ Research / paper-trading only.'
      );
    } catch (err) {
      console.error('Test scan error:', err.message);

      reply(
        msg,
        `❌ Test scan failed:\n${err.message}`
      );
    }
  });

  // /help — show available commands.
  bot.onText(/^\/help$/, (msg) => {
    reply(
      msg,
      [
        '🤖 RazorSignals — Research Scanner',
        '',
        'Available commands:',
        '/start — Subscribe to scanner alerts',
        '/stop — Unsubscribe from scanner alerts',
        '/status — Show scanner status',
        '/testscan — Run one scan immediately',
        '/help — Show this help message',
        '',
        '⚠️ This is a paper-trading / research tool only.',
        'No real trades are placed.',
        'Historical win rates are backtest statistics,',
        'not a guarantee of future profit.',
      ].join('\n')
    );
  });

  console.log(
    'RazorSignals Telegram bot started.\n' +
      'Waiting for Telegram commands...'
  );
}

// Replies directly to the Telegram user who sent the command.
function reply(msg, text) {
  bot
    .sendMessage(msg.chat.id, text)
    .catch((err) =>
      console.error('Telegram reply error:', err.message)
    );
}

// Sends a scanner message to every subscribed Telegram user.
async function broadcast(text) {
  if (subscribers.size === 0) {
    console.error(
      'No Telegram subscribers — cannot broadcast message.'
    );
    return;
  }

  for (const chatId of subscribers) {
    try {
      await bot.sendMessage(chatId, text);
    } catch (err) {
      console.error(
        `Telegram broadcast error for ${chatId}:`,
        err.message
      );
    }
  }
}

module.exports = {
  startBot,
};