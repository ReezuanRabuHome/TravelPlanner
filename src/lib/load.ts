import { cache } from 'react'

import { loadTrip } from './data'
import { createClient } from './supabase/server'

/**
 * Per-request memoised trip loader, so the shell and the page inside it share
 * one round trip to the database instead of two.
 */
export const getTripBundle = cache(async (tripId: string) => {
  const supabase = await createClient()
  return loadTrip(supabase, tripId)
})
