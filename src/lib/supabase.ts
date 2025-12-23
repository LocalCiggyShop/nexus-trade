import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ehkdxygrzinrzheipaia.supabase.co"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      apikey: supabaseAnonKey,
    },
    timeout: 60000,
    heartbeatIntervalMs: 30000,
  },
  global: {
    headers: {
      apikey: supabaseAnonKey,
    },
  },
})

// To Note: If supabase realtime isnt working go to supabase dashboard > Database > Publications > supabase_realtime > (enable) room_members