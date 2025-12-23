import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ehkdxygrzinrzheipaia.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa2R4eWdyemlucnpoZWlwYWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzU2ODYsImV4cCI6MjA4MDg1MTY4Nn0.w5KFieJBXsmh2R-qXLu9gqaCxuBFotHvyMo1gHaeiek"

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