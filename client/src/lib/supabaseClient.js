import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error('[Thrift] Missing REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY. Create client/.env and restart `npm run dev:client`.');
}

const supabase = supabaseConfigured
  ? createClient(url, key)
  : {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => {},
        signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ error: { message: 'Supabase not configured' } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      }),
      channel: () => ({ on: () => ({ subscribe: () => {} }), unsubscribe: () => {} }),
      removeChannel: () => {},
    };

export default supabase;
