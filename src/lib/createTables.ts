import { supabase } from './supabase'

async function createTables() {
  console.log('Creating co-op tables via Edge Function...')

  const { error } = await supabase.functions.invoke('create-coop-tables')

  if (error) {
    console.error('Failed:', error)
  } else {
    console.log('Co-op tables created successfully!')
  }
}

createTables()