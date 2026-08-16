# RazorSignals

A **research / paper-trading** Telegram bot that scans Forex currency pairs and XAUUSD (Gold) for historical trading setups.

> ⚠️ **IMPORTANT:** This is a research project only. It does **not** connect to MT5, place trades, execute orders, handle deposits/withdrawals, or trade real money. All "signals" are paper-trading research results based on backtested historical statistics. No strategy is guaranteed to work, and historical win rates are **not** a guarantee of future profit.

---

## Features

- Telegram bot with `/start`, `/stop`, `/status`, `/help` commands
- Hourly scanner that evaluates Forex pairs + XAUUSD (Gold gets priority)
- Modular strategy engine: trend following, momentum, breakout, support/resistance, volatility, market structure
- Backtesting engine: every setup includes historical win rate, sample count, average holding period, drawdown, strategy name, and testing period
- Only reports setups meeting a configurable minimum win rate (default **70%**)
- Duplicate-prevention: never notifies twice for the same setup
- Weekend mode: detects market closure and resumes when the market reopens
- Scan + setup history persisted to Supabase
- Mock/simulated market data (no live broker connection)

---

## Project Structure

```
src/
  bot.js              # Telegram bot: commands + message forwarding
  scanner.js          # Hourly scan loop, dedup, weekend-mode handling
  marketData.js       # Mock market-data generator + weekend detection
  config.js           # Environment-based configuration
  db.js               # Supabase client singleton
  strategies/
    base.js           # Base strategy class
    trend.js           # Trend following
    momentum.js        # Momentum
    breakout.js        # Breakout
    supportResistance.js # Support / Resistance
    volatility.js      # Volatility expansion
    marketStructure.js # Market structure (BOS)
    index.js          # Strategy registry
  backtesting/
    engine.js         # Historical backtest engine
  utils/
    time.js           # Time + dedup-key helpers
    format.js         # Telegram message formatting
index.js             # Entry point
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (a `.env.example` is provided):

```bash
cp .env.example .env
```

Then fill in your values:

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | The chat ID to send scan results to (your own chat ID) |
| `SUPABASE_URL` | Pre-provisioned Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Pre-provisioned Supabase service-role key |
| `SCAN_INTERVAL_MINUTES` | Scan frequency in minutes (default `60`) |
| `MIN_WIN_RATE` | Minimum historical win rate to report a setup (default `70`) |
| `MIN_SAMPLES` | Minimum historical backtest samples (default `30`) |
| `TESTING_PERIOD` | Backtest testing period label shown in messages |

**Never commit your `.env` file or share your bot token.** API keys and tokens are read from environment variables only — they are never printed or logged.

### 3. Start the bot

```bash
npm start
```

You should see: `RazorSignals Telegram bot started. Waiting for commands...`

### 4. Test the commands

Open Telegram and message your bot:

| Command | What it does |
|---|---|
| `/start` | Enables the research scanner — hourly scans begin immediately |
| `/stop` | Disables the scanner — hourly scans stop |
| `/status` | Shows whether the scanner is currently running |
| `/help` | Lists all available commands |

After `/start`, the scanner runs once immediately and then every hour. If a setup meeting the win-rate threshold is found, the bot sends a formatted research message. If no setup qualifies, nothing is sent (the bot does not force a signal every hour).

---

## Research Message Format

```
📊 HISTORICAL SETUP DETECTED
Asset: XAUUSD
Bias: Bullish
Entry zone: 2350.0 – 2350.1
TP 1: 2353.0
TP 2: 2356.0
TP 3: 2360.0
Historical stop level: 2348.0
Historical win rate: 74.6%
Historical samples: 1248
Detected: 10:00
Historical holding period: ~3h 20m
Strategy:
Trend + breakout + volatility
Testing period: Jan 2018 – Dec 2024
⚠️ PAPER-TRADING / RESEARCH RESULT
```

If only one historical target exists, only TP1 is shown.

---

## Weekend Mode

When the market closes (Friday 22:00 UTC – Sunday 22:00 UTC), the bot sends:

```
🌙 WEEKEND MODE
Forex market is currently closed.
No live setups will be scanned until the market reopens.
Go touch some grass, study, draw, watch some anime, go to church and pray… 😭
I'll be waiting for the next available market session.
```

When the market reopens:

```
🔔 MARKET SESSION ACTIVE
Scanner is back online.
Hourly research scans have resumed.
```

---

## Market Data

This project uses **mock/simulated market data** so it runs without a live data feed. The mock generator produces deterministic OHLC candles seeded by the current hour. To use real historical data, replace `src/marketData.js` with a provider that fetches from your preferred data source — no other modules need to change.

---

## Disclaimer

RazorSignals is a research and education tool. It does not provide financial advice. Historical win rates are backtest statistics computed on simulated data and are **not** a guaranteed probability of future profit. No strategy is guaranteed to work.
