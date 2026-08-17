// Breakout strategy.
// Detects setups when price breaks above a recent range high or below a
// recent range low with increased volume, indicating a potential breakout.

const BaseStrategy = require('./base');
const { roundPrice } = require('../utils/time');

class Breakout extends BaseStrategy {
  constructor() {
    super('Breakout');
  }

  evaluate(candles, asset) {
    if (candles.length < 40) return null;

    const recent = candles.slice(-40);
    const range = recent.slice(0, 30); // use prior 30 for the range
    const breakoutCandles = recent.slice(-10);

    const highs = range.map((c) => c.high);
    const lows = range.map((c) => c.low);
    const rangeHigh = Math.max(...highs);
    const rangeLow = Math.min(...lows);

    const pip = asset.pipSize;
    const last = recent[recent.length - 1];

    // Average volume of the range for comparison.
    const avgVol = avg(range.map((c) => c.volume));

    // Bullish breakout: close above rangeHigh on above-average volume.
    const bullishBreak = breakoutCandles.find(
      (c) => c.close > rangeHigh && c.volume > avgVol * 1.1
    );
    // Bearish breakout: close below rangeLow on above-average volume.
    const bearishBreak = breakoutCandles.find(
      (c) => c.close < rangeLow && c.volume > avgVol * 1.1
    );

    if (!bullishBreak && !bearishBreak) return null;

    const bullish = !!bullishBreak;
    const breakLevel = bullish ? rangeHigh : rangeLow;

    const entryLow = roundPrice(breakLevel - pip * 3, pip);
    const entryHigh = roundPrice(breakLevel + pip * 3, pip);

    const tp1 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 35, pip);
    const tp2 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 70, pip);
    const tp3 = roundPrice(last.close + (bullish ? 1 : -1) * pip * 110, pip);
    const stop = roundPrice(
      last.close + (bullish ? -1 : 1) * pip * 18,
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

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

module.exports = Breakout;
