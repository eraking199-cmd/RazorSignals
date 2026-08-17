// Momentum strategy.
// Detects setups when recent price momentum (rate of change over a short
// window) is strong and sustained in one direction.

const BaseStrategy = require('./base');
const { roundPrice } = require('../utils/time');

class Momentum extends BaseStrategy {
  constructor() {
    super('Momentum');
  }

  evaluate(candles, asset) {
    if (candles.length < 30) return null;

    const recent = candles.slice(-30);
    const closes = recent.map((c) => c.close);

    // Rate of change over the last 10 candles vs the prior 10.
    const early = avg(closes.slice(0, 10));
    const late = avg(closes.slice(-10));
    const roc = late - early;

    const pip = asset.pipSize;
    if (Math.abs(roc) < pip * 10) return null; // need real momentum

    const bullish = roc > 0;
    const last = recent[recent.length - 1];

    // Confirm momentum: last 3 closes should be moving in the trend direction.
    const last3 = closes.slice(-3);
    let confirming = true;
    for (let i = 1; i < last3.length; i++) {
      if (bullish && last3[i] < last3[i - 1]) confirming = false;
      if (!bullish && last3[i] > last3[i - 1]) confirming = false;
    }
    if (!confirming) return null;

    const entryLow = roundPrice(last.close - pip * 4, pip);
    const entryHigh = roundPrice(last.close + pip * 4, pip);

    const tp1 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 25, pip);
    const tp2 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 50, pip);
    const tp3 = null;
    const stop = roundPrice(last.close + (bullish ? -1 : 1) * pip * 15, pip);

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

module.exports = Momentum;
