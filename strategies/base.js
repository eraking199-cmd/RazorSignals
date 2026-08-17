// Base strategy class. Each strategy module extends this and implements
// `evaluate(candles, asset)` which returns a setup object or null.
//
// A setup object looks like:
// {
//   asset:        'XAUUSD',
//   bias:          'Bullish' | 'Bearish',
//   entryLow:      number,
//   entryHigh:     number,
//   tp1:           number,
//   tp2:           number | null,
//   tp3:           number | null,
//   stop:          number,
//   strategyName:  string,   // short label for the message
// }
//
// IMPORTANT: No strategy is guaranteed to work. These are research tools only.

class BaseStrategy {
  constructor(name) {
    this.name = name;
  }

  // Override in subclass. Returns a setup object or null.
  // eslint-disable-next-line no-unused-vars
  evaluate(candles, asset) {
    return null;
  }
}

module.exports = BaseStrategy;
