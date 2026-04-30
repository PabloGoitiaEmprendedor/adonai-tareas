import { createClient } from '@supabase/supabase-js'

const OLD_URL = "https://efkhtifyttuhlxbrbrht.supabase.co"
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVma2h0aWZ5dHR1aGx4YnJicmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjY5NjIsImV4cCI6MjA5MTI0Mjk2Mn0.AXByAH9uDFFbD0RLDSD15INvj6k0qsFbaW6k0aWZ4JU"

// Fixed key from prompt (removed space)
const NEW_URL = "https://bpckgibqjrqdxzbvtiyn.supabase.co"
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY2tnaWJxanJxZHh6YnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTMyNTAsImV4cCI6MjA5MzA2OTI1MH0.zitsCHcdKbw6fQ0Hbl5CTv-6AEJww72Hb5b3pqy6sKU"

const oldSupabase = createClient(OLD_URL, OLD_KEY)
const newSupabase = createClient(NEW_URL, NEW_KEY)

const tables = [
  'profiles',
  'settings',
  'contexts',
  'goals',
  'folders',
  'tasks',
  'time_blocks',
  'recurrence_rules',
  'user_context',
  'google_calendar_tokens',
  'landing_stats',
  'landing_metrics'
]

async function migrate() {
  console.log("Starting data migration...")
  
  for (const table of tables) {
    console.log(`Migrating table: ${table}...`)
    try {
      const { data, error: fetchError } = await oldSupabase.from(table).select('*')
      
      if (fetchError) {
        console.error(`  Error fetching from ${table}: ${fetchError.message}`)
        continue
      }
      
      if (!data || data.length === 0) {
        console.log(`  No data found in ${table}.`)
        continue
      }
      
      console.log(`  Found ${data.length} rows. Inserting into new project...`)
      
      const { error: insertError } = await newSupabase.from(table).upsert(data)
      
      if (insertError) {
        console.error(`  Error inserting into ${table}: ${insertError.message}`)
      } else {
        console.log(`  Successfully migrated ${table}.`)
      }
    } catch (e) {
      console.error(`  Unexpected error for ${table}:`, e.message)
    }
  }
  
  console.log("Migration finished.")
}

migrate()
