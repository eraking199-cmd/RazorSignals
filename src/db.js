// Supabase client singleton for RazorSignals.
// Uses the service-role key so the bot process can write scan/setup records
// regardless of RLS (the bot is a trusted server process, not a browser client).

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let client = null;

function getDb() {
  if (client) return client;

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase credentials are not configured. ' +
      'Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.'
    );
  }

  client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

module.exports = { getDb };
