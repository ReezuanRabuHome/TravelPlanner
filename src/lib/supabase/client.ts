'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Supabase client for the browser. Used for direct-to-storage file uploads. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
