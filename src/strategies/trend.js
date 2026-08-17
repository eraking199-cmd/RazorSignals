// Trend-following strategy.
// Detects setups when price is clearly trending (higher highs / higher lows
// for bullish, lower highs / lower lows for bearish) and the recent close
// confirms the trend direction.

const BaseStrategy = require('./base');
const { roundPrice } = require('../utils/time');

class TrendFollowing extends BaseStrategy {
  constructor() {
    super('Trend following');
  }

  evaluate(candles, asset) {
    if (candles.length < 50) return null;

    const recent = candles.slice(-50);
    const closes = recent.map((c) => c.close);

    // Simple trend slope: compare average of first third vs last third.
    const firstAvg = avg(closes.slice(0, 17));
    const lastAvg = avg(closes.slice(-17));

    const pip = asset.pipSize;
    const slope = lastAvg - firstAvg;

    // Need a meaningful slope (at least 15 pips of movement).
    if (Math.abs(slope) < pip * 15) return null;

    const bullish = slope > 0;
    const last = recent[recent.length - 1];

    // Confirm: last close should be on the trend side of the midpoint.
    const mid = (firstAvg + lastAvg) / 2;
    if (bullish && last.close < mid) return null;
    if (!bullish && last.close > mid) return null;

    const entryLow = roundPrice(last.close - pip * 5, pip);
    const entryHigh = roundPrice(last.close + pip * 5, pip);

    const tp1 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 30, pip);
    const tp2 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 60, pip);
    const tp3 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 100, pip);
    const stop = roundPrice(last.close + (bullish ? -1 : 1) * pip * 20, pip);

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

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

module.exports = TrendFollowing;
