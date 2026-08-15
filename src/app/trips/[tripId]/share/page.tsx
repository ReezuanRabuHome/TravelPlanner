import { notFound } from 'next/navigation'

import { createShareLinkForm, revokeShareLink } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import { getTripBundle } from '@/lib/load'
import type { ShareLink } from '@/lib/types'

export default async function SharePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params
  const bundle = await getTripBundle(tripId)
  if (!bundle) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('share_links')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  const links = (data ?? []) as ShareLink[]
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  return (
    <>
      <div className="viewhead">
        <div>
          <h1>Share links</h1>
          <p className="sub">
            A link lets someone read the trip and open its documents on their own phone. They cannot
            change anything, and they never need an account.
          </p>
        </div>
      </div>

      <div className="panel">
        <h3>Create a link</h3>
        <div className="inner">
          <form action={createShareLinkForm.bind(null, tripId)} className="inlineform">
            <input
              name="label"
              placeholder="Who is it for — e.g. Mum, or the family group chat"
              aria-label="Label"
            />
            <button className="btn stamp" type="submit">
              Create link
            </button>
          </form>
        </div>
      </div>

      <p className="sechead">Existing links</p>
      {links.length === 0 ? (
        <div className="emptyday">
          <strong>No links yet</strong>
          <span>Create one above and send it to whoever is travelling with you.</span>
        </div>
      ) : (
        links.map((link) => (
          <div className="sharerow" key={link.id} data-revoked={link.revoked}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{link.label ?? 'Family link'}</span>
            <code>
              {origin || 'https://your-app.vercel.app'}/share/{link.token}
            </code>
            {link.revoked ? (
              <span className="badge warn">Revoked</span>
            ) : (
              <>
                <span className="badge ok">Active</span>
                <form action={revokeShareLink.bind(null, link.id, tripId)}>
                  <button className="btn danger" type="submit">
                    Revoke
                  </button>
                </form>
              </>
            )}
          </div>
        ))
      )}

      <p style={{ marginTop: 20, fontSize: 13.5, color: 'var(--muted)', maxWidth: '62ch' }}>
        Anyone holding an active link can see this trip, so treat it like the paperwork itself —
        passport scans are behind it. Revoking takes effect immediately.
      </p>
    </>
  )
}
