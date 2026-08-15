import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

import { siteOrigin } from '@/lib/origin'
import { createClient } from '@/lib/supabase/server'

/** Landing point for the emailed magic link. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Behind a proxy, request.url can carry an internal host. Redirect to the origin
  // the browser actually used, or the session cookie lands on the wrong domain.
  const origin = await siteOrigin()
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/trips'

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/login?error=That+link+is+no+longer+valid`)
}
