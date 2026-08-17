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
const { getDb } = require('./db');

const {
  formatSetupMessage,
  formatWeekendMessage,
  formatMarketActiveMessage,
} = require('./utils/format');

let bot = null;

// -----------------------------------------------------------------------------
// Supabase subscriber management
// -----------------------------------------------------------------------------

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
      { onConflict: 'chat_id' }
    );

  if (error) {
    throw new Error(`Failed to subscribe: ${error.message}`);
  }
}

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

async function getSubscriberCount() {
  const db = getDb();

  const { count, error } = await db
    .from('subscribers')
    .select('chat_id', { count: 'exact', head: true })
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to count subscribers: ${error.message}`);
  }

  return count || 0;
}

async function getActiveSubscribers() {
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
// Telegram initialization
// -----------------------------------------------------------------------------

// Initializes Telegram without starting polling.
// Used by GitHub Actions for scheduled scans.
function initTelegramSender() {
  if (!config.telegramBotToken) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not set.'
    );
  }

  if (!bot) {
    bot = new TelegramBot(config.telegramBotToken, {
      polling: false,
    });
  }
}

// -----------------------------------------------------------------------------
// Normal Telegram bot startup
// -----------------------------------------------------------------------------

function startBot() {
  if (!config.telegramBotToken) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not set. Add it to your .env file (see README).'
    );
  }

  bot = new TelegramBot(config.telegramBotToken, {
    polling: true,
  });

  scanner.setCallbacks({
    onSetup: (setup) => broadcast(formatSetupMessage(setup)),
    onWeekend: () => broadcast(formatWeekendMessage()),
    onMarketActive: () => broadcast(formatMarketActiveMessage()),
  });

  // /start
  bot.onText(/^\/start$/, async (msg) => {
    try {
      await addSubscriber(msg.chat.id);

      reply(
        msg,
        '✅ You are subscribed to RazorSignals alerts.\n\n' +
          'You will receive qualifying research signals here.\n\n' +
          'This is a paper-trading / research tool — no real trades are placed.'
      );
    } catch (err) {
      console.error('Subscribe error:', err.message);

      reply(
        msg,
        '❌ I could not subscribe you right now.\n\n' +
          'Please try /start again in a moment.'
      );
    }
  });

  // /stop
  bot.onText(/^\/stop$/, async (msg) => {
    try {
      const subscribed = await isSubscriber(msg.chat.id);

      if (!subscribed) {
        reply(
          msg,
          'ℹ️ You are not currently subscribed to scanner alerts.'
        );
        return;
      }

      await removeSubscriber(msg.chat.id);

      reply(
        msg,
        '⏹ You have been unsubscribed from RazorSignals alerts.\n\n' +
          'Use /start again whenever you want to resubscribe.'
      );
    } catch (err) {
      console.error('Unsubscribe error:', err.message);

      reply(
        msg,
        '❌ I could not unsubscribe you right now.'
      );
    }
  });

  // /status
  bot.onText(/^\/status$/, async (msg) => {
    try {
      const subscribed = await isSubscriber(msg.chat.id);
      const count = await getSubscriberCount();

      reply(
        msg,
        [
          subscribed
            ? '🔔 You are subscribed to RazorSignals alerts.'
            : '🔕 You are not subscribed to RazorSignals alerts.',
          '',
          `👥 Active subscribers: ${count}`,
          '',
          '⏰ Scans are handled by the scheduled RazorSignals scanner.',
          '',
          subscribed
            ? 'You will receive qualifying signals here.'
            : 'Use /start to subscribe.',
        ].join('\n')
      );
    } catch (err) {
      console.error('Status error:', err.message);

      reply(
        msg,
        '❌ I could not retrieve your status right now.'
      );
    }
  });

  // /testscan
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

  // /help
  bot.onText(/^\/help$/, (msg) => {
    reply(
      msg,
      [
        '🤖 RazorSignals — Research Scanner',
        '',
        'Available commands:',
        '/start — Subscribe to scanner alerts',
        '/stop — Unsubscribe from scanner alerts',
        '/status — Show subscription status',
        '/testscan — Run one scan immediately',
        '/help — Show this help message',
        '',
        '⚠️ This is a paper-trading / research tool only.',
        'No real trades are placed.',
      ].join('\n')
    );
  });

  console.log(
    'RazorSignals Telegram bot started.\n' +
      'Waiting for Telegram commands...'
  );
}

// -----------------------------------------------------------------------------
// Reply to a Telegram user
// -----------------------------------------------------------------------------

function reply(msg, text) {
  if (!bot) return;

  bot
    .sendMessage(msg.chat.id, text)
    .catch((err) =>
      console.error('Telegram reply error:', err.message)
    );
}

// -----------------------------------------------------------------------------
// Broadcast to every active subscriber
// -----------------------------------------------------------------------------

async function broadcast(text) {
  if (!bot) {
    console.error(
      'Telegram sender is not initialized — cannot broadcast.'
    );
    return;
  }

  let chatIds;

  try {
    chatIds = await getActiveSubscribers();
  } catch (err) {
    console.error(
      'Could not load Telegram subscribers:',
      err.message
    );
    return;
  }

  if (chatIds.length === 0) {
    console.log(
      'No active Telegram subscribers — nothing to broadcast.'
    );
    return;
  }

  for (const chatId of chatIds) {
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
  initTelegramSender,
  broadcast,
};
