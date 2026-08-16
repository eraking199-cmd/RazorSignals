// Mock market-data provider for RazorSignals.
//
// Until a real historical market-data source is configured, this module
// generates deterministic, realistic-looking OHLC (candle) data for each
// supported asset. The data is seeded by the current hour so each hourly scan
// sees a fresh but reproducible set of candles.
//
// IMPORTANT: This is simulated data for research/paper-trading only.
// It does NOT connect to MT5 or any live broker, and no real trades are placed.

const config = require('./config');

// Deterministic pseudo-random generator seeded by a string.
// Uses a simple hash so the same seed always produces the same sequence.
function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // xorshift32-style state derived from the hash
  let state = h >>> 0 || 1;
  return function () {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

// Base prices for each asset so generated data looks realistic.
const basePrices = {
  XAUUSD: 2350,
  EURUSD: 1.0850,
  GBPUSD: 1.2700,
  USDJPY: 157.00,
  AUDUSD: 0.6600,
  USDCAD: 1.3650,
  USDCHF: 0.8900,
  NZDUSD: 0.6100,
};

// Generates `count` hourly candles for the given asset, seeded by the hour.
// Each candle has open, high, low, close, and a volume-ish value.
function generateCandles(symbol, count, seedKey) {
  const rand = seededRandom(seedKey);
  const base = basePrices[symbol] || 100;
  const pip = config.assets.find((a) => a.symbol === symbol)?.pipSize || 0.01;
  const volatility = symbol === 'XAUUSD' ? 3.0 : 0.4; // gold moves more

  const candles = [];
  let price = base;

  for (let i = 0; i < count; i++) {
    const open = price;
    const drift = (rand() - 0.5) * volatility * pip * 10;
    const close = open + drift;
    const wick = Math.abs(rand() - 0.5) * volatility * pip * 8;
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;
    const volume = Math.round(rand() * 1000 + 200);

    candles.push({
      time: i,
      open: round(open, pip),
      high: round(high, pip),
      low: round(low, pip),
      close: round(close, pip),
      volume,
    });

    price = close;
  }

  return candles;
}

function round(value, pip) {
  const decimals = (String(pip).split('.')[1] || '').length;
  return Number(value.toFixed(decimals));
}

// Returns the latest candle data for every supported asset, seeded by the
// current hour so a single scan sees consistent data across strategies.
function getMarketData(scanKey) {
  const data = {};
  for (const asset of config.assets) {
    const seed = `${asset.symbol}-${scanKey}`;
    data[asset.symbol] = generateCandles(asset.symbol, 200, seed);
  }
  return data;
}

// Forex market hours: open Sunday 22:00 UTC, close Friday 22:00 UTC.
// Returns true if the market is currently open, false during weekend/market closure.
function isMarketOpen(date = new Date()) {
  const day = date.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const hour = date.getUTCHours();

  // Saturday (6) and most of Sunday (0) before 22:00 → closed.
  if (day === 6) return false; // Saturday all day
  if (day === 0 && hour < 22) return false; // Sunday before 22:00
  if (day === 5 && hour >= 22) return false; // Friday after 22:00

  return true;
}

module.exports = {
  getMarketData,
  isMarketOpen,
  generateCandles,
};
