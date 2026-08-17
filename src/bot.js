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
//
// Subscriber chat IDs are stored permanently in Supabase.

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const scanner = require('./scanner');
const { getDb } = require('./db');

const {
  formatSetupMessage,
  formatWeekendMessage,
  formatMarketActiveMessage,
} = require('./utils/format');

let bot = null;

// -----------------------------------------------------------------------------
// Subscriber management
// -----------------------------------------------------------------------------

// Adds a Telegram user as an active subscriber.
async function addSubscriber(chatId) {
  const db = getDb();

  const { error } = await db
    .from('subscribers')
    .upsert(
      {
        chat_id: chatId,
        active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'chat_id',
      }
    );

  if (error) {
    throw new Error(`Failed to subscribe: ${error.message}`);
  }
}

// Marks a Telegram user as inactive.
async function removeSubscriber(chatId) {
  const db = getDb();

  const { error } = await db
    .from('subscribers')
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('chat_id', chatId);

  if (error) {
    throw new Error(`Failed to unsubscribe: ${error.message}`);
  }
}

// Checks whether a Telegram user is currently subscribed.
async function isSubscriber(chatId) {
  const db = getDb();

  const { data, error } = await db
    .from('subscribers')
    .select('chat_id')
    .eq('chat_id', chatId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check subscription: ${error.message}`);
  }

  return !!data;
}

// Returns the number of active subscribers.
async function getSubscriberCount() {
  const db = getDb();

  const { count, error } = await db
    .from('subscribers')
    .select('chat_id', {
      count: 'exact',
      head: true,
    })
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to count subscribers: ${error.message}`);
  }

  return count || 0;
}

// Gets every active subscriber.
async function getSubscribers() {
  const db = getDb();

  const { data, error } = await db
    .from('subscribers')
    .select('chat_id')
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to load subscribers: ${error.message}`);
  }

  return (data || []).map((row) => row.chat_id);
}

// -----------------------------------------------------------------------------
// Bot startup
// -----------------------------------------------------------------------------

function startBot() {
  if (!config.telegramBotToken) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not set. Add it to your environment variables.'
    );
  }

  bot = new TelegramBot(config.telegramBotToken, {
    polling: true,
  });

  // Wire scanner callbacks to Telegram notifications.
  scanner.setCallbacks({
    onSetup: (setup) => broadcast(formatSetupMessage(setup)),
    onWeekend: () => broadcast(formatWeekendMessage()),
    onMarketActive: () => broadcast(formatMarketActiveMessage()),
  });

  // ---------------------------------------------------------------------------
  // /start — subscribe this Telegram user
  // ---------------------------------------------------------------------------

  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      await addSubscriber(chatId);

      // Start the scanner if it isn't already running.
      const started = scanner.start();

      await reply(
        msg,
        started
          ? '✅ You are subscribed to RazorSignals alerts.\n\n' +
              '🟢 Research scanner enabled. Hourly scans are now running.\n\n' +
              'This is a paper-trading / research tool — no real trades are placed.'
          : '✅ You are subscribed to RazorSignals alerts.\n\n' +
              'ℹ️ Research scanner is already running.'
      );
    } catch (err) {
      console.error('Start command error:', err.message);

      await reply(
        msg,
        '❌ Could not subscribe you right now.\n\n' +
          'Please try again later.'
      );
    }
  });

  // ---------------------------------------------------------------------------
  // /stop — unsubscribe this Telegram user
  // ---------------------------------------------------------------------------

  bot.onText(/^\/stop$/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const wasSubscribed = await isSubscriber(chatId);

      if (!wasSubscribed) {
        await reply(
          msg,
          'ℹ️ You are not currently subscribed to RazorSignals alerts.'
        );
        return;
      }

      await removeSubscriber(chatId);

      await reply(
        msg,
        '⏹ You have been unsubscribed from RazorSignals alerts.\n\n' +
          'You can use /start at any time to subscribe again.'
      );
    } catch (err) {
      console.error('Stop command error:', err.message);

      await reply(
        msg,
        '❌ Could not unsubscribe you right now.\n\n' +
          'Please try again later.'
      );
    }
  });

  // ---------------------------------------------------------------------------
  // /status — show scanner and subscription status
  // ---------------------------------------------------------------------------

  bot.onText(/^\/status$/, async (msg) => {
    try {
      const running = scanner.isRunning();
      const subscribed = await isSubscriber(msg.chat.id);
      const subscriberCount = await getSubscriberCount();

      await reply(
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
          `👥 Active subscribers: ${subscriberCount}`,
          '',
          running
            ? 'Hourly market scans are active.'
            : 'Use /start to enable the scanner.',
        ].join('\n')
      );
    } catch (err) {
      console.error('Status command error:', err.message);

      await reply(
        msg,
        '❌ Could not retrieve status right now.'
      );
    }
  });

  // ---------------------------------------------------------------------------
  // /testscan — run one scan immediately
  // ---------------------------------------------------------------------------

  bot.onText(/^\/testscan$/, async (msg) => {
    await reply(msg, '🧪 Running a test scan now...');

    try {
      await scanner.runScan();

      await reply(
        msg,
        '✅ Test scan finished.\n\n' +
          'If a qualifying setup was found, it will be sent as a signal.\n' +
          'If the market is closed, you will see weekend mode instead.\n\n' +
          '⚠️ Research / paper-trading only.'
      );
    } catch (err) {
      console.error('Test scan error:', err.message);

      await reply(
        msg,
        `❌ Test scan failed:\n${err.message}`
      );
    }
  });

  // ---------------------------------------------------------------------------
  // /help — show available commands
  // ---------------------------------------------------------------------------

  bot.onText(/^\/help$/, async (msg) => {
    await reply(
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

// -----------------------------------------------------------------------------
// Reply helper
// -----------------------------------------------------------------------------

async function reply(msg, text) {
  try {
    await bot.sendMessage(msg.chat.id, text);
  } catch (err) {
    console.error(
      'Telegram reply error:',
      err.message
    );
  }
}

// -----------------------------------------------------------------------------
// Broadcast helper
// -----------------------------------------------------------------------------

// Sends a scanner message to every active subscriber stored in Supabase.
async function broadcast(text) {
  if (!bot) {
    console.error(
      'Telegram bot is not initialized — cannot broadcast message.'
    );
    return;
  }

  try {
    const subscribers = await getSubscribers();

    if (subscribers.length === 0) {
      console.error(
        'No active Telegram subscribers — cannot broadcast message.'
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
  } catch (err) {
    console.error(
      'Failed to load Telegram subscribers:',
      err.message
    );
  }
}

module.exports = {
  startBot,
  broadcast,
  getSubscribers,
};
