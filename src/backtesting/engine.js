// Backtesting engine for RazorSignals.
//
// For every detected setup, this module runs a historical backtest of the
// generating strategy on the asset's candle data. It computes:
//   - win rate (percentage of setups that reached TP1)
//   - number of historical samples
//   - average holding period
//   - drawdown where available
//
// IMPORTANT: The historical win rate is a backtest statistic, NOT a guaranteed
// probability of future profit. It is computed on simulated/mock data until a
// real historical data source is configured, so the numbers are illustrative.

const config = require('../config');

// Runs a historical backtest for a strategy on the given candles.
// Returns a stats object: { winRate, samples, holdingPeriod, drawdown }
function backtest(strategy, candles, asset) {
  const results = [];
  const holdingBars = [];
  const equityCurve = [];
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  // Walk forward through the candles, evaluating the strategy at each bar
  // using only the data available up to that point.
  for (let i = 60; i < candles.length - 20; i++) {
    const window = candles.slice(0, i + 1);
    const setup = strategy.evaluate(window, asset);
    if (!setup) continue;

    // "Execute" the setup on the following candles to see if TP1 is hit
    // before the stop.
    const future = candles.slice(i + 1, i + 21);
    let outcome = 'loss';
    let bars = 20;

    for (let j = 0; j < future.length; j++) {
      const c = future[j];
      const hitTp =
        setup.bias === 'Bullish'
          ? c.high >= setup.tp1
          : c.low <= setup.tp1;
      const hitStop =
        setup.bias === 'Bullish'
          ? c.low <= setup.stop
          : c.high >= setup.stop;

      if (hitTp && !hitStop) {
        outcome = 'win';
        bars = j + 1;
        break;
      }
      if (hitStop && !hitTp) {
        outcome = 'loss';
        bars = j + 1;
        break;
      }
    }

    results.push(outcome);
    holdingBars.push(bars);

    equity += outcome === 'win' ? 1 : -1;
    peak = Math.max(peak, equity);
    const dd = peak - equity;
    maxDrawdown = Math.max(maxDrawdown, dd);
    equityCurve.push(equity);
  }

  const samples = results.length;
  const wins = results.filter((r) => r === 'win').length;
  const winRate = samples > 0 ? (wins / samples) * 100 : 0;

  const avgBars =
    holdingBars.length > 0
      ? holdingBars.reduce((s, v) => s + v, 0) / holdingBars.length
      : 0;

  // Convert average bars (hourly candles) to a human-readable holding period.
  const holdingPeriod = formatHoldingPeriod(avgBars);

  // Drawdown as a count of consecutive losing setups (illustrative).
  const drawdown = samples > 0 ? `${maxDrawdown} consecutive losses` : null;

  return { winRate, samples, holdingPeriod, drawdown };
}

// Converts an average bar count into a "~Xh Ym" string (each bar = 1 hour).
function formatHoldingPeriod(avgBars) {
  if (avgBars <= 0) return 'n/a';
  const totalMinutes = Math.round(avgBars * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `~${hours}h ${minutes}m`;
}

module.exports = { backtest };
