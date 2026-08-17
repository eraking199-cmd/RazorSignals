// Message formatting helpers for the Telegram bot.

// Formats a single detected setup into the research message format.
// Only shows TP2/TP3 if they exist; shows TP1 alone when that's all we have.
function formatSetupMessage(setup) {
  const lines = [];

  lines.push('📊 HISTORICAL SETUP DETECTED');
  lines.push(`Asset: ${setup.asset}`);
  lines.push(`Bias: ${setup.bias}`);
  lines.push(`Entry zone: ${setup.entryLow} – ${setup.entryHigh}`);
  lines.push(`TP 1: ${setup.tp1}`);

  if (setup.tp2 != null) {
    lines.push(`TP 2: ${setup.tp2}`);
  }
  if (setup.tp3 != null) {
    lines.push(`TP 3: ${setup.tp3}`);
  }

  lines.push(`Historical stop level: ${setup.stop}`);
  lines.push(`Historical win rate: ${Number(setup.winRate).toFixed(1)}%`);
  lines.push(`Historical samples: ${setup.samples}`);
  lines.push(`Detected: ${setup.detected_time}`);
  lines.push(`Historical holding period: ${setup.holdingPeriod || 'n/a'}`);

  if (setup.drawdown) {
    lines.push(`Historical drawdown: ${setup.drawdown}`);
  }

  lines.push(`Strategy:`);
  lines.push(setup.strategyName);
  lines.push(`Testing period: ${setup.testingPeriod}`);
  lines.push('⚠️ PAPER-TRADING / RESEARCH RESULT');

  return lines.join('\n');
}

// Weekend-mode message sent once when the market closes.
function formatWeekendMessage() {
  return [
    '🌙 WEEKEND MODE',
    'Forex market is currently closed.',
    'No live setups will be scanned until the market reopens.',
    'Go touch some grass, study, draw, watch some anime, go to church and pray… 😭',
    "I'll be waiting for the next available market session.",
  ].join('\n');
}

// Market-session-active message sent when the market reopens.
function formatMarketActiveMessage() {
  return [
    '🔔 MARKET SESSION ACTIVE',
    'Scanner is back online.',
    'Hourly research scans have resumed.',
  ].join('\n');
}

module.exports = {
  formatSetupMessage,
  formatWeekendMessage,
  formatMarketActiveMessage,
};
