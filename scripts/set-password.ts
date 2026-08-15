/**
 * Set (or create) the owner account's password, without sending any email.
 *
 *   npm run set-password -- you@example.com "your new password"
 *
 * Supabase's built-in mail service allows only a couple of messages an hour and is
 * explicitly not for production, which makes magic links a poor fit for an app with
 * one account. This is also the password-reset path: there is no "forgot password"
 * email to wait on, you just run this again.
 *
 * Runs locally against .env.local and needs the secret key, so it is not something
 * that can be triggered from the deployed app.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Usage: npm run set-password -- <email> "<password>"')
  process.exit(1)
}

if (password.length < 8) {
  console.error('Supabase requires at least 8 characters.')
  process.exit(1)
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error

  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (updateError) throw updateError
    console.log(`Password set for ${email}.`)
  } else {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) throw createError
    console.log(`Created ${email} with that password.`)
  }

  console.log('Sign in at /login — no email involved.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
