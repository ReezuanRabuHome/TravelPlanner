import { redirect } from 'next/navigation'

import { siteOrigin } from '@/lib/origin'
import { createClient, getUser } from '@/lib/supabase/server'

export const metadata = { title: 'Sign in · Boarding Pass' }

async function sendMagicLink(formData: FormData) {
  'use server'

  const email = String(formData.get('email') ?? '').trim()
  if (!email) redirect('/login?error=Enter+your+email+address')

  const supabase = await createClient()
  const origin = await siteOrigin()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  })

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  redirect('/login?sent=1')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const user = await getUser()
  if (user) redirect('/trips')

  const { sent, error } = await searchParams

  return (
    <div className="centred">
      <div className="card">
        <p className="eyebrow">Boarding Pass</p>
        <h1>Sign in</h1>
        <p className="lede">
          We email you a link — no password to remember while you are standing in an airport queue.
        </p>

        {sent && (
          <p className="notice">
            Check your inbox. The link signs you straight in and expires in an hour.
          </p>
        )}
        {error && <p className="notice bad">{error}</p>}

        <form action={sendMagicLink}>
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <button className="btn stamp" type="submit" style={{ width: '100%' }}>
            Email me a sign-in link
          </button>
        </form>
      </div>
    </div>
  )
}
