/**
 * Safety net for scripts/smoke.ts — removes any throwaway users, trips or files
 * a interrupted smoke run left behind. Safe to run at any time; it only ever
 * touches accounts whose email starts with "smoke-".
 *
 *   npx tsx scripts/purge-smoke.ts
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error

  const smoke = data.users.filter((u) => u.email?.startsWith('smoke-'))
  console.log(`real users:  ${data.users.length - smoke.length}`)
  console.log(`smoke users: ${smoke.length}`)

  for (const user of smoke) {
    const { data: trips } = await admin.from('trips').select('id').eq('owner_id', user.id)

    for (const trip of trips ?? []) {
      const { data: files } = await admin.storage.from('trip-documents').list(trip.id)
      if (files?.length) {
        await admin.storage.from('trip-documents').remove(files.map((f) => `${trip.id}/${f.name}`))
        console.log(`  removed ${files.length} file(s) from trip ${trip.id}`)
      }
    }

    await admin.auth.admin.deleteUser(user.id)
    console.log(`  deleted ${user.email} (${trips?.length ?? 0} trip(s) cascaded)`)
  }

  const { count } = await admin.from('trips').select('id', { count: 'exact', head: true })
  console.log(`\ntrips remaining in the project: ${count}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
