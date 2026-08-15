/**
 * End-to-end smoke test against the real Supabase project.
 *
 * Creates two throwaway users, drives a full trip through the same code paths the
 * app uses, checks that row level security genuinely isolates them, and deletes
 * everything it made. Run with:
 *
 *   npx tsx scripts/smoke.ts
 */

import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { buildFlags } from '../src/lib/flags'
import { loadTrip, resolveShareToken } from '../src/lib/data'
import { PERTH_2026 } from '../src/lib/seed/perth-2026'

// ---------------------------------------------------------------- env
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SECRET = process.env.SUPABASE_SECRET_KEY!

const admin = createClient(URL, SECRET, { auth: { persistSession: false } })

let failures = 0
const created: { users: string[]; paths: string[] } = { users: [], paths: [] }

function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

function section(title: string) {
  console.log(`\n${title}`)
}

async function makeUser(tag: string) {
  const email = `smoke-${tag}-${Date.now()}@example.com`
  const password = `Pw-${Math.random().toString(36).slice(2)}-9xQ`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`could not create user: ${error?.message}`)
  created.users.push(data.user.id)

  const client = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`could not sign in: ${signInError.message}`)

  return { client, id: data.user.id }
}

/** The same inserts the seedPerthTrip server action performs. */
async function seed(supabase: SupabaseClient, ownerId: string) {
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({ ...PERTH_2026.trip, owner_id: ownerId })
    .select()
    .single()
  if (error) throw new Error(`trip insert failed: ${error.message}`)

  const { data: bookings } = await supabase
    .from('bookings')
    .insert(
      PERTH_2026.bookings.map((b, i) => ({
        trip_id: trip.id,
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

  const bookingIds = new Map<string, string>()
  PERTH_2026.bookings.forEach((s, i) => {
    if (bookings?.[i]) bookingIds.set(s.key, bookings[i].id)
  })

  const { data: days } = await supabase
    .from('trip_days')
    .insert(
      PERTH_2026.days.map((d) => ({
        trip_id: trip.id,
        day_number: d.number,
        date: d.date,
        title: d.title,
        summary: d.summary,
      })),
    )
    .select()

  const dayIds = new Map<number, string>()
  for (const d of days ?? []) dayIds.set(d.day_number, d.id)

  const { error: eventError } = await supabase.from('events').insert(
    PERTH_2026.days.flatMap((day) =>
      day.events.map((e, i) => ({
        trip_id: trip.id,
        day_id: dayIds.get(day.number)!,
        start_time: e.time,
        title: e.title,
        note: e.note ?? null,
        kind: e.kind ?? null,
        bullets: e.bullets ?? [],
        booking_id: e.booking ? (bookingIds.get(e.booking) ?? null) : null,
        sort_order: i,
      })),
    ),
  )
  if (eventError) throw new Error(`event insert failed: ${eventError.message}`)

  await supabase.from('prep_items').insert(
    PERTH_2026.days.flatMap((day) =>
      day.prep.map((p, i) => ({
        trip_id: trip.id,
        day_id: dayIds.get(day.number)!,
        label: p.label,
        done: p.done ?? false,
        sort_order: i,
      })),
    ),
  )

  await supabase.from('documents').insert(
    PERTH_2026.documents.map((d) => ({
      trip_id: trip.id,
      day_id: d.day ? (dayIds.get(d.day) ?? null) : null,
      booking_id: d.booking ? (bookingIds.get(d.booking) ?? null) : null,
      label: d.label,
      needed_on: d.needed_on ?? null,
    })),
  )

  return trip.id as string
}

async function main() {
  section('Schema')
  for (const table of [
    'trips',
    'trip_days',
    'bookings',
    'events',
    'prep_items',
    'documents',
    'share_links',
  ]) {
    const { error } = await admin.from(table).select('*', { head: true, count: 'exact' })
    check(`table ${table}`, !error, error?.message)
  }

  const { data: buckets } = await admin.storage.listBuckets()
  const bucket = buckets?.find((b) => b.id === 'trip-documents')
  check('bucket trip-documents exists', Boolean(bucket))
  check('bucket is private', bucket?.public === false, `public=${bucket?.public}`)

  section('Seeding the Perth trip as a signed-in user')
  const owner = await makeUser('owner')
  const tripId = await seed(owner.client, owner.id)
  check('trip created', Boolean(tripId))

  const bundle = await loadTrip(owner.client, tripId)
  check('bundle loads', Boolean(bundle))
  check('8 days', bundle?.days.length === 8, `got ${bundle?.days.length}`)
  check('4 bookings', bundle?.bookings.length === 4, `got ${bundle?.bookings.length}`)
  // 12 + 5 + 2 + 2 + 3 + 2 + 0 (empty Friday) + 5
  check('31 events', bundle?.events.length === 31, `got ${bundle?.events.length}`)
  check('8 documents', bundle?.documents.length === 8, `got ${bundle?.documents.length}`)

  section('Flag engine')
  const flags = buildFlags(bundle!)
  for (const f of flags) console.log(`        [${f.level}] ${f.title}`)
  check('flags produced', flags.length > 0, `${flags.length} flags`)
  check(
    'catches the empty Friday',
    flags.some((f) => f.title.includes('28 August') && f.level === 'empty'),
  )
  check(
    'catches the 03:00 car return',
    flags.some((f) => f.title.includes('03:00')),
  )
  check(
    'catches leaving before checkout',
    flags.some((f) => f.title.includes('before checkout')),
  )
  check(
    'catches missing rental agreement',
    flags.some((f) => f.title.startsWith('Rental agreement')),
  )
  check(
    'does not double-report the flight paperwork',
    !flags.some((f) => f.title.startsWith('Nothing attached to')),
    'a placeholder document already names it',
  )

  section('Row level security')
  const intruder = await makeUser('intruder')
  const { data: stolen } = await intruder.client.from('trips').select('*').eq('id', tripId)
  check('another user sees 0 trips', (stolen?.length ?? 0) === 0, `saw ${stolen?.length}`)

  const { data: stolenEvents } = await intruder.client
    .from('events')
    .select('*')
    .eq('trip_id', tripId)
  check('another user sees 0 events', (stolenEvents?.length ?? 0) === 0, `saw ${stolenEvents?.length}`)

  const { error: writeError } = await intruder.client
    .from('events')
    .insert({ trip_id: tripId, day_id: bundle!.days[0].id, title: 'injected' })
  check('another user cannot write', Boolean(writeError), writeError?.message ?? 'INSERT SUCCEEDED')

  section('Storage')
  const path = `${tripId}/${crypto.randomUUID()}-scoot-FB9QWW.pdf`
  const pdf = new Blob([`%PDF-1.4\nsmoke test\n%%EOF`], { type: 'application/pdf' })

  const { error: uploadError } = await owner.client.storage
    .from('trip-documents')
    .upload(path, pdf, { contentType: 'application/pdf' })
  check('owner can upload', !uploadError, uploadError?.message)
  if (!uploadError) created.paths.push(path)

  const intruderPath = `${tripId}/${crypto.randomUUID()}-stolen.pdf`
  const { error: intruderUpload } = await intruder.client.storage
    .from('trip-documents')
    .upload(intruderPath, pdf, { contentType: 'application/pdf' })
  check(
    'another user cannot upload into this trip',
    Boolean(intruderUpload),
    intruderUpload?.message ?? 'UPLOAD SUCCEEDED',
  )
  if (!intruderUpload) created.paths.push(intruderPath)

  const doc = bundle!.documents.find((d) => d.label === 'Scoot itinerary — TR 8')!
  await owner.client
    .from('documents')
    .update({
      file_name: 'scoot-FB9QWW.pdf',
      storage_path: path,
      mime_type: 'application/pdf',
      size_bytes: 30,
    })
    .eq('id', doc.id)

  const { data: signed } = await owner.client.storage
    .from('trip-documents')
    .createSignedUrl(path, 300)
  check('signed url minted', Boolean(signed?.signedUrl))

  if (signed?.signedUrl) {
    const res = await fetch(signed.signedUrl)
    check('signed url downloads', res.ok, `HTTP ${res.status}`)
    const body = await res.text()
    check('content round-trips', body.includes('smoke test'))
  }

  const publicGuess = `${URL}/storage/v1/object/public/trip-documents/${path}`
  const publicRes = await fetch(publicGuess)
  check('file is NOT publicly readable', !publicRes.ok, `HTTP ${publicRes.status}`)

  section('Share links')
  const token = 'smoke' + Math.random().toString(36).slice(2, 14)
  const { error: shareError } = await owner.client
    .from('share_links')
    .insert({ trip_id: tripId, token, label: 'Smoke test link' })
  check('share link created', !shareError, shareError?.message)

  const resolved = await resolveShareToken(admin, token)
  check('token resolves', resolved?.trip_id === tripId)

  const shared = await loadTrip(admin, resolved!.trip_id)
  check('share view loads the trip', shared?.days.length === 8)

  await owner.client.from('share_links').update({ revoked: true }).eq('token', token)
  const afterRevoke = await resolveShareToken(admin, token)
  check('revoked token stops resolving', afterRevoke === null)

  const badToken = await resolveShareToken(admin, 'definitely-not-a-real-token')
  check('unknown token rejected', badToken === null)

  section('Flags after uploading one document')
  const after = await loadTrip(owner.client, tripId)
  const afterFlags = buildFlags(after!)
  check(
    'TR 8 no longer flagged as missing',
    !afterFlags.some((f) => f.title.includes('Scoot itinerary — TR 8')),
    `${afterFlags.length} flags remain`,
  )
}

/**
 * Always runs, and never throws — a failure here would otherwise abandon test
 * users inside a live project. `npm run purge` mops up anything it misses.
 */
async function cleanup() {
  section('Cleanup')
  try {
    if (created.paths.length) {
      const { error } = await admin.storage.from('trip-documents').remove(created.paths)
      check('files removed', !error, error?.message ?? `${created.paths.length} file(s)`)
    }

    for (const id of created.users) {
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) check(`delete user ${id}`, false, error.message)
    }
    check('test users removed', true, `${created.users.length} users`)
  } catch (err) {
    check('cleanup', false, err instanceof Error ? err.message : String(err))
    console.error('  Run `npm run purge` to remove anything left behind.')
  }
}

async function run() {
  try {
    await main()
  } catch (err) {
    failures++
    console.error(`\n  FAIL  ${err instanceof Error ? err.message : String(err)}`)
  }

  await cleanup()

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
  process.exitCode = failures === 0 ? 0 : 1
}

void run()
