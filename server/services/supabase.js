const { createClient } = require('@supabase/supabase-js');

// Service role client — bypasses RLS for trusted server operations.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
