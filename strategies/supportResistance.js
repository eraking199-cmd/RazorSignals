// Support/Resistance strategy.
// Detects setups when price approaches a key support or resistance level
// that has been tested multiple times, suggesting a potential reversal.

const BaseStrategy = require('./base');
const { roundPrice } = require('../utils/time');

class SupportResistance extends BaseStrategy {
  constructor() {
    super('Support / Resistance');
  }

  evaluate(candles, asset) {
    if (candles.length < 60) return null;

    const recent = candles.slice(-60);
    const pip = asset.pipSize;

    // Find swing highs and lows (local extremes over a 5-candle window).
    const swingHighs = [];
    const swingLows = [];
    for (let i = 2; i < recent.length - 2; i++) {
      const window = recent.slice(i - 2, i + 3);
      if (recent[i].high === Math.max(...window.map((c) => c.high))) {
        swingHighs.push(recent[i].high);
      }
      if (recent[i].low === Math.min(...window.map((c) => c.low))) {
        swingLows.push(recent[i].low);
      }
    }

    // Cluster swing highs/lows into resistance/support levels.
    const resistance = clusterLevels(swingHighs, pip * 10);
    const support = clusterLevels(swingLows, pip * 10);

    const last = recent[recent.length - 1];
    const lastClose = last.close;

    // Check if price is near a support or resistance level.
    const nearResistance = resistance.find(
      (r) => Math.abs(lastClose - r) < pip * 8
    );
    const nearSupport = support.find(
      (s) => Math.abs(lastClose - s) < pip * 8
    );

    if (!nearResistance && !nearSupport) return null;

    // Bullish reaction at support, bearish reaction at resistance.
    const bullish = !!nearSupport;
    const level = bullish ? nearSupport : nearResistance;

    const entryLow = roundPrice(level - pip * 5, pip);
    const entryHigh = roundPrice(level + pip * 5, pip);

    const tp1 = roundPrice(lastClose + (bullish ? 1 : -1) * pip * 25, pip);
    const tp2 = roundPrice(lastClose + (bullish ? 1 : -1) * pip * 45, pip);
    const tp3 = null;
    const stop = roundPrice(
      level + (bullish ? -1 : 1) * pip * 15,
      pip
    );

    return {
      asset: asset.symbol,
      bias: bullish ? 'Bullish' : 'Bearish',
      entryLow,
      entryHigh,
      tp1,
      tp2,
      tp3,
      stop,
      strategyName: this.name,
    };
  }
}

// Clusters nearby price levels into a single average level.
function clusterLevels(levels, tolerance) {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - current[current.length - 1] < tolerance) {
      current.push(sorted[i]);
    } else {
      clusters.push(avg(current));
      current = [sorted[i]];
    }
  }
  clusters.push(avg(current));
  return clusters;
}

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

module.exports = SupportResistance;
