import { redirect } from 'next/navigation'

import { siteOrigin } from '@/lib/origin'
import { createClient, getUser } from '@/lib/supabase/server'

export const metadata = { title: 'Sign in · Boarding Pass' }

async function signInWithPassword(formData: FormData) {
  'use server'

  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    redirect('/login?error=Enter+your+email+and+password')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Supabase says "Invalid login credentials" for both a wrong password and an
    // account that has never had one set. Say so, since the second case is the
    // likely one here and has a different fix.
    redirect(
      `/login?error=${encodeURIComponent(
        error.message === 'Invalid login credentials'
          ? 'Wrong password — or this account has no password yet. Run: npm run set-password'
          : error.message,
      )}`,
    )
  }

  redirect('/trips')
}

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

  if (error) {
    const friendly = /rate|limit/i.test(error.message)
      ? 'Supabase’s built-in email allows only a couple of messages per hour. Use a password instead.'
      : error.message
    redirect(`/login?error=${encodeURIComponent(friendly)}`)
  }

  redirect('/login?sent=1')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; link?: string }>
}) {
  const user = await getUser()
  if (user) redirect('/trips')

  const { sent, error, link } = await searchParams
  const wantsLink = link === '1'

  return (
    <div className="centred">
      <div className="card">
        <p className="eyebrow">Boarding Pass</p>
        <h1>Sign in</h1>
        <p className="lede">
          {wantsLink
            ? 'We email you a link. Note that the built-in mail service is rate limited to a couple of messages an hour.'
            : 'One account owns the trips. Everyone else reads them through a share link.'}
        </p>

        {sent && (
          <p className="notice">Check your inbox. The link signs you in and expires in an hour.</p>
        )}
        {error && <p className="notice bad">{error}</p>}

        {wantsLink ? (
          <>
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
            <p style={{ marginTop: 16, fontSize: 13.5, textAlign: 'center' }}>
              <a className="linkbtn" href="/login">
                Use a password instead
              </a>
            </p>
          </>
        ) : (
          <>
            <form action={signInWithPassword}>
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
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                />
              </label>
              <button className="btn stamp" type="submit" style={{ width: '100%' }}>
                Sign in
              </button>
            </form>
            <p style={{ marginTop: 16, fontSize: 13.5, textAlign: 'center' }}>
              <a className="linkbtn" href="/login?link=1">
                Email me a link instead
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
