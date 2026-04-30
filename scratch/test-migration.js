import { createClient } from '@supabase/supabase-js'

const OLD_URL = "https://efkhtifyttuhlxbrbrht.supabase.co"
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVma2h0aWZ5dHR1aGx4YnJicmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjY5NjIsImV4cCI6MjA5MTI0Mjk2Mn0.AXByAH9uDFFbD0RLDSD15INvj6k0qsFbaW6k0aWZ4JU"

const NEW_URL = "https://bpckgibqjrqdxzbvtiyn.supabase.co"
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY2tnaWJxanJxZHh6YnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTMyNTAsImV4cCI6MjA5MzA2OTI1MH0.zitsCHcdKbw6fQ0Hbl5CTv-6AEJww72Hb5b3pqy6sKU"

const oldSupabase = createClient(OLD_URL, OLD_KEY)
const newSupabase = createClient(NEW_URL, NEW_KEY)

async function test() {
  console.log("Checking tasks in old project...")
  const { data, error } = await oldSupabase.from('tasks').select('*').limit(5)
  if (error) {
    console.error("Error fetching tasks:", error.message)
  } else {
    console.log(`Found ${data.length} tasks in old project.`)
    console.log("Sample tasks:", data)
  }
}

test()
