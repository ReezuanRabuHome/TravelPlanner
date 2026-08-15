import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses RLS, so it must never be imported into anything
 * that reaches the browser — the `server-only` import above enforces that at build time.
 *
 * Used for exactly one job: rendering a read-only trip for a family member who
 * holds a valid share token and has no account of their own.
 */
export function createAdminClient() {
  // Newer Supabase projects issue `sb_secret_…` keys; older ones a `service_role`
  // JWT. Either works here, so accept whichever the project has.
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      'No Supabase secret key set. Share links need SUPABASE_SECRET_KEY (Project Settings ' +
        '→ API Keys → Secret keys). Every other part of the app works without it.',
    )
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
