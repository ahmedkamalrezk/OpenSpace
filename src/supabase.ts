import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Supabase now recommends publishable keys for browser clients. Keep accepting
// the legacy anon key so existing projects continue to work.
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(url && publicKey)
export const supabase = isSupabaseConfigured ? createClient(url!, publicKey!) : null
