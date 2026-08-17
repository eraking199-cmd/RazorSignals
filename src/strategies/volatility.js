// Volatility strategy.
// Detects setups when volatility expands (range widens significantly) after
// a period of contraction, often preceding a strong directional move.

const BaseStrategy = require('./base');
const { roundPrice } = require('../utils/time');

class Volatility extends BaseStrategy {
  constructor() {
    super('Volatility');
  }

  evaluate(candles, asset) {
    if (candles.length < 50) return null;

    const recent = candles.slice(-50);
    const pip = asset.pipSize;

    // Compare the average range of the last 10 candles vs the prior 20.
    const last10 = recent.slice(-10);
    const prior20 = recent.slice(-30, -10);

    const lastRange = avg(last10.map((c) => c.high - c.low));
    const priorRange = avg(prior20.map((c) => c.high - c.low));

    // Volatility expansion: recent range at least 1.6x the prior range.
    if (lastRange < priorRange * 1.6) return null;

    // Direction: majority of last 5 closes vs their opens.
    const last5 = recent.slice(-5);
    let bullCount = 0;
    for (const c of last5) {
      if (c.close > c.open) bullCount++;
    }
    const bullish = bullCount >= 3;
    if (bullCount !== 3 && bullCount !== 4 && bullCount !== 5) return null;

    const last = recent[recent.length - 1];
    const entryLow = roundPrice(last.close - pip * 6, pip);
    const entryHigh = roundPrice(last.close + pip * 6, pip);

    const tp1 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 30, pip);
    const tp2 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 65, pip);
    const tp3 = null;
    const stop = roundPrice(last.close + (bullish ? -1 : 1) * pip * 22, pip);

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

module.exports = Volatility;
