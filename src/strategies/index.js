// Strategy registry.
// Loads all strategy modules and exposes them as an array so the scanner can
// run each one independently against market data.
//
// IMPORTANT: No strategy is guaranteed to work. These are research tools for
// paper-trading analysis only.

const TrendFollowing = require('./trend');
const Momentum = require('./momentum');
const Breakout = require('./breakout');
const SupportResistance = require('./supportResistance');
const Volatility = require('./volatility');
const MarketStructure = require('./marketStructure');

const strategies = [
  new TrendFollowing(),
  new Momentum(),
  new Breakout(),
  new SupportResistance(),
  new Volatility(),
  new MarketStructure(),
];

module.exports = strategies;
