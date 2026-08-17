// Time and formatting helpers shared across the scanner, strategies, and bot.

// Returns the current UTC Date.
function nowUtc() {
  return new Date();
}

// Formats a Date as "HH:MM" in UTC (the time zone used for market hours).
function formatTime(date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

// Formats a Date as an ISO-style timestamp for storage/logging.
function formatTimestamp(date) {
  return date.toISOString();
}

// Rounds a price to the given pip size, avoiding floating-point noise.
function roundPrice(price, pipSize) {
  const decimals = (String(pipSize).split('.')[1] || '').length;
  return Number(price.toFixed(decimals));
}

// Builds a stable dedup key for a setup so the scanner can avoid sending
// the same setup twice. Keyed on asset + strategy + rounded entry zone.
function buildDedupKey(asset, strategy, entryLow, entryHigh) {
  return `${asset}|${strategy}|${entryLow}|${entryHigh}`;
}

module.exports = {
  nowUtc,
  formatTime,
  formatTimestamp,
  roundPrice,
  buildDedupKey,
};
