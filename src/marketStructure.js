// Market-structure strategy.
// Detects setups based on market-structure concepts: higher-high/higher-low
// sequences (bullish structure) or lower-high/lower-low sequences (bearish
// structure), plus a break of structure (BOS) confirmation.

const BaseStrategy = require('./base');
const { roundPrice } = require('../utils/time');

class MarketStructure extends BaseStrategy {
  constructor() {
    super('Market structure');
  }

  evaluate(candles, asset) {
    if (candles.length < 60) return null;

    const recent = candles.slice(-60);
    const pip = asset.pipSize;

    // Identify swing highs and lows over a 5-candle window.
    const swingHighs = [];
    const swingLows = [];
    for (let i = 2; i < recent.length - 2; i++) {
      const window = recent.slice(i - 2, i + 3);
      if (recent[i].high === Math.max(...window.map((c) => c.high))) {
        swingHighs.push({ index: i, value: recent[i].high });
      }
      if (recent[i].low === Math.min(...window.map((c) => c.low))) {
        swingLows.push({ index: i, value: recent[i].low });
      }
    }

    if (swingHighs.length < 2 || swingLows.length < 2) return null;

    // Bullish structure: higher highs + higher lows, then a break of the last
    // swing high (BOS).
    const lastHigh = swingHighs[swingHighs.length - 1];
    const prevHigh = swingHighs[swingHighs.length - 2];
    const lastLow = swingLows[swingLows.length - 1];
    const prevLow = swingLows[swingLows.length - 2];

    const lastClose = recent[recent.length - 1].close;

    const bullishStructure =
      lastHigh.value > prevHigh.value && lastLow.value > prevLow.value;
    const bearishStructure =
      lastHigh.value < prevHigh.value && lastLow.value < prevLow.value;

    if (!bullishStructure && !bearishStructure) return null;

    const bullish = bullishStructure;

    // Break of structure: close beyond the last swing high (bullish) or low
    // (bearish).
    const bos =
      (bullish && lastClose > lastHigh.value) ||
      (!bullish && lastClose < lastLow.value);

    if (!bos) return null;

    const entryLow = roundPrice(lastClose - pip * 5, pip);
    const entryHigh = roundPrice(lastClose + pip * 5, pip);

    const tp1 = roundPrice(lastClose + (bullish ? 1 : -1) * pip * 28, pip);
    const tp2 = roundPrice(lastClose + (bullish ? 1 : -1) * pip * 55, pip);
    const tp3 = roundPrice(lastClose + (bullish ? 1 : -1) * pip * 90, pip);
    const stop = roundPrice(
      lastClose + (bullish ? -1 : 1) * pip * 18,
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

module.exports = MarketStructure;
