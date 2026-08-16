// Scanner — the core hourly research loop for RazorSignals.
//
// Responsibilities:
//   - Evaluate all supported assets once per hour using mock market data.
//   - Run each strategy independently against each asset.
//   - Backtest every detected setup and only keep setups whose historical
//     win rate meets the configurable minimum threshold (default 70%).
//   - Prevent duplicate notifications for the same setup (dedup via Supabase).
//   - Detect weekend/market-closure and emit weekend-mode + market-active
//     transitions (each sent once).
//   - Record the timestamp of every scan and every detected setup.
//
// IMPORTANT: This is a research / paper-trading scanner. It does NOT connect
// to MT5, place trades, or handle real money.

const config = require('./config');
const { getMarketData, isMarketOpen } = require('./marketData');
const strategies = require('./strategies');
const { backtest } = require('./backtesting/engine');
const { getDb } = require('./db');
const { nowUtc, formatTime, buildDedupKey } = require('./utils/time');

let scanning = false;
let intervalHandle = null;
let inWeekendMode = false;
let onSetupCallback = null; // called with a formatted setup when one is detected
let onWeekendCallback = null; // called when weekend mode begins
let onMarketActiveCallback = null; // called when market reopens

// Registers callbacks the bot uses to forward messages to Telegram.
function setCallbacks({ onSetup, onWeekend, onMarketActive }) {
  onSetupCallback = onSetup || null;
  onWeekendCallback = onWeekend || null;
  onMarketActiveCallback = onMarketActive || null;
}

// Starts the hourly scanner.
function start() {
  if (scanning) return false;
  scanning = true;
  // Run an immediate scan, then schedule the hourly interval.
  runScan().catch((err) => console.error('Scan error:', err.message));
  intervalHandle = setInterval(
    () => runScan().catch((err) => console.error('Scan error:', err.message)),
    config.scanIntervalMinutes * 60 * 1000
  );
  return true;
}

// Stops the hourly scanner.
function stop() {
  if (!scanning) return false;
  scanning = false;
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  return true;
}

// Returns whether the scanner is currently running.
function isRunning() {
  return scanning;
}

// Runs a single scan cycle.
async function runScan() {
  const scanTime = nowUtc();
  const marketOpen = isMarketOpen(scanTime);

  // Weekend / market-closure handling.
  if (!marketOpen) {
    if (!inWeekendMode) {
      inWeekendMode = true;
      if (onWeekendCallback) await onWeekendCallback();
    }
    await recordScan(scanTime, false, 0, 'weekend mode');
    return;
  }

  // Market reopened after a weekend.
  if (inWeekendMode) {
    inWeekendMode = false;
    if (onMarketActiveCallback) await onMarketActiveCallback();
  }

  const scanKey = scanTime.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
  const marketData = getMarketData(scanKey);

  // XAUUSD gets priority: evaluate it first, and if it produces a setup,
  // we still evaluate the rest but XAUUSD is reported first.
  const sortedAssets = [...config.assets].sort(
    (a, b) => a.priority - b.priority
  );

  const detectedSetups = [];

  for (const asset of sortedAssets) {
    const candles = marketData[asset.symbol];
    if (!candles || candles.length === 0) continue;

    for (const strategy of strategies) {
      const setup = strategy.evaluate(candles, asset);
      if (!setup) continue;

      // Backtest the setup.
      const stats = backtest(strategy, candles, asset);

      // Only keep setups meeting the minimum win rate and sample thresholds.
      if (stats.winRate < config.minWinRate) continue;
      if (stats.samples < config.minSamples) continue;

      const dedupKey = buildDedupKey(
        setup.asset,
        setup.strategyName,
        setup.entryLow,
        setup.entryHigh
      );

      // Duplicate prevention: check Supabase for an existing setup.
      const alreadyExists = await setupAlreadyDetected(dedupKey);
      if (alreadyExists) continue;

      const fullSetup = {
        ...setup,
        winRate: stats.winRate,
        samples: stats.samples,
        holdingPeriod: stats.holdingPeriod,
        drawdown: stats.drawdown,
        testingPeriod: config.testingPeriod,
        dedupKey,
        detected_time: formatTime(scanTime),
      };

      // Persist the setup.
      await persistSetup(fullSetup);
      detectedSetups.push(fullSetup);

      // Notify via callback (bot forwards to Telegram).
      if (onSetupCallback) await onSetupCallback(fullSetup);
    }
  }

  await recordScan(scanTime, true, detectedSetups.length, null);
}

// Checks whether a setup with this dedup key already exists in Supabase.
async function setupAlreadyDetected(dedupKey) {
  try {
    const db = getDb();
    const { data, error } = await db
      .from('setups')
      .select('id')
      .eq('dedup_key', dedupKey)
      .maybeSingle();
    if (error) {
      console.error('Dedup check error:', error.message);
      return false; // on error, allow the insert (it may fail on unique key)
    }
    return !!data;
  } catch (err) {
    console.error('Dedup check failed:', err.message);
    return false;
  }
}

// Persists a detected setup to Supabase.
async function persistSetup(setup) {
  try {
    const db = getDb();
    const { error } = await db.from('setups').insert({
      asset: setup.asset,
      bias: setup.bias,
      entry_zone_low: setup.entryLow,
      entry_zone_high: setup.entryHigh,
      tp1: setup.tp1,
      tp2: setup.tp2 || null,
      tp3: setup.tp3 || null,
      stop_level: setup.stop,
      win_rate: setup.winRate,
      samples: setup.samples,
      holding_period: setup.holdingPeriod,
      drawdown: setup.drawdown,
      strategy: setup.strategyName,
      testing_period: setup.testingPeriod,
      dedup_key: setup.dedupKey,
    });
    if (error && error.code !== '23505') {
      // 23505 = unique violation (duplicate), which we handle gracefully.
      console.error('Setup persist error:', error.message);
    }
  } catch (err) {
    console.error('Setup persist failed:', err.message);
  }
}

// Records a scan row in Supabase.
async function recordScan(scanTime, marketOpen, setupsDetected, notes) {
  try {
    const db = getDb();
    const { error } = await db.from('scans').insert({
      scanned_at: scanTime.toISOString(),
      market_open: marketOpen,
      setups_detected: setupsDetected,
      notes,
    });
    if (error) console.error('Scan record error:', error.message);
  } catch (err) {
    console.error('Scan record failed:', err.message);
  }
}

module.exports = {
  start,
  stop,
  isRunning,
  setCallbacks,
  runScan,
};
