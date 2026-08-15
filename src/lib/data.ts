import type { SupabaseClient } from '@supabase/supabase-js'

import type { TripBundle } from './types'

/**
 * Load a whole trip in one go. Works with either client:
 *  - the signed-in owner's client, where RLS does the access check, or
 *  - the service-role client, where a validated share token did.
 */
export async function loadTrip(
  supabase: SupabaseClient,
  tripId: string,
): Promise<TripBundle | null> {
  const [tripRes, daysRes, eventsRes, bookingsRes, prepRes, docsRes] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
    supabase.from('trip_days').select('*').eq('trip_id', tripId).order('day_number'),
    supabase.from('events').select('*').eq('trip_id', tripId).order('sort_order'),
    supabase.from('bookings').select('*').eq('trip_id', tripId).order('sort_order'),
    supabase.from('prep_items').select('*').eq('trip_id', tripId).order('sort_order'),
    supabase.from('documents').select('*').eq('trip_id', tripId).order('created_at'),
  ])

  if (tripRes.error || !tripRes.data) return null

  return {
    trip: tripRes.data,
    days: daysRes.data ?? [],
    events: eventsRes.data ?? [],
    bookings: bookingsRes.data ?? [],
    prep: prepRes.data ?? [],
    documents: docsRes.data ?? [],
  }
}

export async function listTrips(supabase: SupabaseClient) {
  const { data } = await supabase.from('trips').select('*').order('start_date', { ascending: true })
  return data ?? []
}

/**
 * Resolve a share token to its trip. Returns null for unknown, revoked or
 * expired tokens — the caller should treat all three the same way.
 */
export async function resolveShareToken(supabase: SupabaseClient, token: string) {
  const { data } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', token)
    .eq('revoked', false)
    .maybeSingle()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  return data
}
