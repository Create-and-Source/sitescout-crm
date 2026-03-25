import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zccqoxomaowljrwjrjip.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjY3FveG9tYW93bGpyd2pyamlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTczMDUsImV4cCI6MjA5MDAzMzMwNX0.A9KycA0fg38PcmsYJGEVGbzeYv_Z9rKdD_r8Hnm85wA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
