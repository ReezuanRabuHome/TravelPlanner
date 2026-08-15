import { headers } from 'next/headers'

/**
 * The URL this request actually arrived on.
 *
 * Deliberately NOT read from NEXT_PUBLIC_SITE_URL first. That variable is inlined
 * at build time, so a wrong or stale value silently emails people a localhost
 * sign-in link from production — and setting it correctly still needs a rebuild
 * before it takes effect. Reading the request headers is right on every
 * deployment, including Vercel previews, with nothing to configure.
 *
 * The env var stays as a fallback for contexts with no request (scripts, tests).
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers()

  // Vercel and most proxies set x-forwarded-*; `host` covers running directly.
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')

  if (host) return `${proto}://${host}`

  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}
