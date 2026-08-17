/*
# RazorSignals research scanner tables

1. New Tables
- `scans` — one row per hourly scanner evaluation. Records when the scan ran,
  whether the market was open, and how many setups were detected.
  - `id` (uuid, primary key)
  - `scanned_at` (timestamptz, when the scan executed, defaults to now)
  - `market_open` (boolean, whether the market was open at scan time)
  - `setups_detected` (integer, number of setups found in this scan)
  - `notes` (text, optional human-readable notes, e.g. "weekend mode")

- `setups` — one row per detected research setup. Stores the asset, bias,
  calculated levels, backtest stats, and the strategy that generated it.
  Used for duplicate-prevention (dedup key on asset + strategy + entry zone)
  and historical reporting.
  - `id` (uuid, primary key)
  - `detected_at` (timestamptz, when the setup was detected, defaults to now)
  - `asset` (text, e.g. "XAUUSD", "EURUSD")
  - `bias` (text, "Bullish" | "Bearish")
  - `entry_zone_low` (numeric, lower bound of entry range)
  - `entry_zone_high` (numeric, upper bound of entry range)
  - `tp1` (numeric, target profit 1)
  - `tp2` (numeric, target profit 2, nullable)
  - `tp3` (numeric, target profit 3, nullable)
  - `stop_level` (numeric, historical stop level)
  - `win_rate` (numeric, historical win rate percentage, e.g. 74.6)
  - `samples` (integer, number of historical backtest samples)
  - `holding_period` (text, human-readable average holding period, e.g. "~3h 20m")
  - `drawdown` (text, historical drawdown where available, nullable)
  - `strategy` (text, strategy name(s) that generated the setup)
  - `testing_period` (text, backtest testing period description)
  - `dedup_key` (text, unique key to prevent duplicate notifications for the same setup)

2. Security
- Enable RLS on both tables.
- This is a single-tenant research bot (no sign-in screen). The bot process
  uses the service-role key for writes, and anon/authenticated are allowed
  full CRUD because the data is intentionally shared within the project.

3. Indexes
- Index on `setups.detected_at` for time-based queries.
- Index on `setups.dedup_key` for duplicate-prevention lookups.
- Index on `scans.scanned_at` for scan-history queries.

4. Important Notes
- The dedup_key column has a UNIQUE constraint so duplicate inserts fail
  gracefully — the scanner catches this to suppress repeat notifications.
- All numeric columns use numeric type for precision of price levels.
*/

CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  market_open boolean NOT NULL DEFAULT true,
  setups_detected integer NOT NULL DEFAULT 0,
  notes text
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scans" ON scans;
CREATE POLICY "anon_select_scans" ON scans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scans" ON scans;
CREATE POLICY "anon_insert_scans" ON scans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scans" ON scans;
CREATE POLICY "anon_update_scans" ON scans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scans" ON scans;
CREATE POLICY "anon_delete_scans" ON scans FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at timestamptz NOT NULL DEFAULT now(),
  asset text NOT NULL,
  bias text NOT NULL,
  entry_zone_low numeric NOT NULL,
  entry_zone_high numeric NOT NULL,
  tp1 numeric NOT NULL,
  tp2 numeric,
  tp3 numeric,
  stop_level numeric NOT NULL,
  win_rate numeric NOT NULL,
  samples integer NOT NULL,
  holding_period text,
  drawdown text,
  strategy text NOT NULL,
  testing_period text NOT NULL,
  dedup_key text UNIQUE NOT NULL
);

ALTER TABLE setups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_setups" ON setups;
CREATE POLICY "anon_select_setups" ON setups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_setups" ON setups;
CREATE POLICY "anon_insert_setups" ON setups FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_setups" ON setups;
CREATE POLICY "anon_update_setups" ON setups FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_setups" ON setups;
CREATE POLICY "anon_delete_setups" ON setups FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_setups_detected_at ON setups (detected_at);
CREATE INDEX IF NOT EXISTS idx_setups_dedup_key ON setups (dedup_key);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans (scanned_at);
