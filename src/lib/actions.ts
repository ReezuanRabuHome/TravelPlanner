'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { PERTH_2026 } from './seed/perth-2026'
import { createClient, getUser } from './supabase/server'

const BUCKET = 'trip-documents'

async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

/** Fail loudly rather than silently doing nothing — RLS errors are easy to miss. */
function assertOk(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`)
}

// ------------------------------------------------------------------ seeding

export async function seedPerthTrip() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({ ...PERTH_2026.trip, owner_id: user.id })
    .select()
    .single()
  assertOk(tripError, 'Could not create the trip')

  // bookings first — events and documents point at them
  const bookingIds = new Map<string, string>()
  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .insert(
      PERTH_2026.bookings.map((b, i) => ({
        trip_id: trip!.id,
        kind: b.kind,
        title: b.title,
        subtitle: b.subtitle,
        reference: b.reference ?? null,
        starts_at: b.starts_at ?? null,
        ends_at: b.ends_at ?? null,
        details: b.details,
        sort_order: i,
      })),
    )
    .select()
  assertOk(bookingError, 'Could not create bookings')

  PERTH_2026.bookings.forEach((seed, i) => {
    const created = bookings?.[i]
    if (created) bookingIds.set(seed.key, created.id)
  })

  const { data: days, error: dayError } = await supabase
    .from('trip_days')
    .insert(
      PERTH_2026.days.map((d) => ({
        trip_id: trip!.id,
        day_number: d.number,
        date: d.date,
        title: d.title,
        summary: d.summary,
      })),
    )
    .select()
  assertOk(dayError, 'Could not create days')

  const dayIds = new Map<number, string>()
  for (const day of days ?? []) dayIds.set(day.day_number, day.id)

  const events = PERTH_2026.days.flatMap((day) =>
    day.events.map((e, i) => ({
      trip_id: trip!.id,
      day_id: dayIds.get(day.number)!,
      start_time: e.time,
      title: e.title,
      note: e.note ?? null,
      kind: e.kind ?? null,
      bullets: e.bullets ?? [],
      booking_id: e.booking ? (bookingIds.get(e.booking) ?? null) : null,
      sort_order: i,
    })),
  )
  if (events.length)
    assertOk((await supabase.from('events').insert(events)).error, 'Could not create events')

  const prep = PERTH_2026.days.flatMap((day) =>
    day.prep.map((p, i) => ({
      trip_id: trip!.id,
      day_id: dayIds.get(day.number)!,
      label: p.label,
      done: p.done ?? false,
      sort_order: i,
    })),
  )
  if (prep.length)
    assertOk((await supabase.from('prep_items').insert(prep)).error, 'Could not create prep items')

  const documents = PERTH_2026.documents.map((d) => ({
    trip_id: trip!.id,
    day_id: d.day ? (dayIds.get(d.day) ?? null) : null,
    booking_id: d.booking ? (bookingIds.get(d.booking) ?? null) : null,
    label: d.label,
    needed_on: d.needed_on ?? null,
  }))
  assertOk((await supabase.from('documents').insert(documents)).error, 'Could not create documents')

  revalidatePath('/trips')
  redirect(`/trips/${trip!.id}`)
}

export async function deleteTrip(tripId: string) {
  await requireUser()
  const supabase = await createClient()
  assertOk(
    (await supabase.from('trips').delete().eq('id', tripId)).error,
    'Could not delete the trip',
  )
  revalidatePath('/trips')
  redirect('/trips')
}

// ------------------------------------------------------------------ prep list

export async function setPrepDone(id: string, done: boolean, tripId: string) {
  await requireUser()
  const supabase = await createClient()
  assertOk(
    (await supabase.from('prep_items').update({ done }).eq('id', id)).error,
    'Could not update the item',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

export async function addPrepItem(tripId: string, dayId: string | null, label: string) {
  await requireUser()
  const trimmed = label.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const { count } = await supabase
    .from('prep_items')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .eq('day_id', dayId ?? '')

  assertOk(
    (
      await supabase.from('prep_items').insert({
        trip_id: tripId,
        day_id: dayId,
        label: trimmed,
        sort_order: count ?? 0,
      })
    ).error,
    'Could not add the item',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

export async function removePrepItem(id: string, tripId: string) {
  await requireUser()
  const supabase = await createClient()
  assertOk(
    (await supabase.from('prep_items').delete().eq('id', id)).error,
    'Could not remove the item',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

// ------------------------------------------------------------------ events

export async function setEventDone(id: string, done: boolean, tripId: string) {
  await requireUser()
  const supabase = await createClient()
  assertOk(
    (await supabase.from('events').update({ done }).eq('id', id)).error,
    'Could not update the event',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

export async function addEvent(input: {
  tripId: string
  dayId: string
  title: string
  time: string | null
  note: string | null
  kind: string | null
}) {
  await requireUser()
  const title = input.title.trim()
  if (!title) return

  const supabase = await createClient()
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('day_id', input.dayId)

  assertOk(
    (
      await supabase.from('events').insert({
        trip_id: input.tripId,
        day_id: input.dayId,
        title,
        start_time: input.time || null,
        note: input.note?.trim() || null,
        kind: input.kind?.trim() || null,
        sort_order: count ?? 0,
      })
    ).error,
    'Could not add the event',
  )
  revalidatePath(`/trips/${input.tripId}`, 'layout')
}

export async function removeEvent(id: string, tripId: string) {
  await requireUser()
  const supabase = await createClient()
  assertOk(
    (await supabase.from('events').delete().eq('id', id)).error,
    'Could not remove the event',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

// ------------------------------------------------------------------ documents

/**
 * Called after the browser has put the file into storage. Either fills in an
 * existing placeholder row or creates a new document.
 */
export async function registerDocument(input: {
  tripId: string
  documentId?: string
  dayId?: string | null
  bookingId?: string | null
  label?: string
  fileName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  neededOn?: string | null
}) {
  await requireUser()
  const supabase = await createClient()

  const payload = {
    file_name: input.fileName,
    storage_path: input.storagePath,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
  }

  if (input.documentId) {
    assertOk(
      (await supabase.from('documents').update(payload).eq('id', input.documentId)).error,
      'Could not attach the file',
    )
  } else {
    assertOk(
      (
        await supabase.from('documents').insert({
          trip_id: input.tripId,
          day_id: input.dayId ?? null,
          booking_id: input.bookingId ?? null,
          label: input.label?.trim() || input.fileName,
          needed_on: input.neededOn ?? null,
          ...payload,
        })
      ).error,
      'Could not save the document',
    )
  }

  revalidatePath(`/trips/${input.tripId}`, 'layout')
}

/** Detach the file but keep the row, so it stays on the list as still-needed. */
export async function clearDocumentFile(documentId: string, tripId: string) {
  await requireUser()
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle()

  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path])
  }

  assertOk(
    (
      await supabase
        .from('documents')
        .update({ storage_path: null, file_name: null, mime_type: null, size_bytes: null })
        .eq('id', documentId)
    ).error,
    'Could not remove the file',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

export async function addExpectedDocument(tripId: string, label: string, neededOn: string | null) {
  await requireUser()
  const trimmed = label.trim()
  if (!trimmed) return

  const supabase = await createClient()
  assertOk(
    (
      await supabase.from('documents').insert({
        trip_id: tripId,
        label: trimmed,
        needed_on: neededOn || null,
      })
    ).error,
    'Could not add the document',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

export async function deleteDocument(documentId: string, tripId: string) {
  await requireUser()
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle()

  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path])
  }

  assertOk(
    (await supabase.from('documents').delete().eq('id', documentId)).error,
    'Could not delete the document',
  )
  revalidatePath(`/trips/${tripId}`, 'layout')
}

// ------------------------------------------------------------------ share links

function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 28)
}

export async function createShareLink(tripId: string, label: string) {
  await requireUser()
  const supabase = await createClient()

  assertOk(
    (
      await supabase.from('share_links').insert({
        trip_id: tripId,
        token: makeToken(),
        label: label.trim() || 'Family link',
      })
    ).error,
    'Could not create the link',
  )
  revalidatePath(`/trips/${tripId}/share`)
}

// ------------------------------------------------------------------ form wrappers
// Bound with .bind() in the pages so plain <form action={…}> works with no
// client-side JavaScript at all — which matters on a hotel wifi at 1am.

export async function addPrepItemForm(tripId: string, dayId: string | null, formData: FormData) {
  await addPrepItem(tripId, dayId, String(formData.get('label') ?? ''))
}

export async function addEventForm(tripId: string, dayId: string, formData: FormData) {
  await addEvent({
    tripId,
    dayId,
    title: String(formData.get('title') ?? ''),
    time: String(formData.get('time') ?? '') || null,
    note: String(formData.get('note') ?? '') || null,
    kind: String(formData.get('kind') ?? '') || null,
  })
}

export async function addExpectedDocumentForm(tripId: string, formData: FormData) {
  await addExpectedDocument(
    tripId,
    String(formData.get('label') ?? ''),
    String(formData.get('needed_on') ?? '') || null,
  )
}

export async function createShareLinkForm(tripId: string, formData: FormData) {
  await createShareLink(tripId, String(formData.get('label') ?? ''))
}

export async function revokeShareLink(id: string, tripId: string) {
  await requireUser()
  const supabase = await createClient()
  assertOk(
    (await supabase.from('share_links').update({ revoked: true }).eq('id', id)).error,
    'Could not revoke the link',
  )
  revalidatePath(`/trips/${tripId}/share`)
}
