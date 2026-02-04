import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://otkpdhkerefqaulhagqw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90a3BkaGtlcmVmcWF1bGhhZ3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzYyNjYsImV4cCI6MjA4NTcxMjI2Nn0.obFxuIiCtOLooXCCOB6StxdZY-UvhPfWCiDI1JW0zKY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});
