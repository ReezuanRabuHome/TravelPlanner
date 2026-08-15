import { redirect } from 'next/navigation'
import Link from 'next/link'

import { seedPerthTrip } from '@/lib/actions'
import { listTrips } from '@/lib/data'
import { shortDate } from '@/lib/format'
import { createClient, getUser } from '@/lib/supabase/server'

export const metadata = { title: 'Your trips · Boarding Pass' }

export default async function TripsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const trips = await listTrips(supabase)

  return (
    <div className="app-frame">
      <div className="topbar" style={{ borderRadius: 12, borderBottomColor: 'var(--rule-hard)' }}>
        <span className="brand">
          <span className="glyph" aria-hidden="true">
            ✦
          </span>{' '}
          Boarding Pass
        </span>
        <span className="tripchip">
          {user.email} <span>signed in</span>
        </span>
        <form action="/auth/signout" method="post" style={{ marginLeft: 'auto' }}>
          <button className="btn sec" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <div style={{ marginTop: 26 }}>
        <div className="viewhead">
          <div>
            <h1>Your trips</h1>
            <p className="sub">Each one carries its own days, bookings and paperwork.</p>
          </div>
        </div>

        {trips.length === 0 ? (
          <div className="emptyday">
            <strong>No trips yet</strong>
            <span>Start with the Perth family holiday — it comes in fully populated.</span>
            <form action={seedPerthTrip} style={{ marginTop: 16 }}>
              <button className="btn stamp" type="submit">
                Add the Perth 2026 trip
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="triplist">
              {trips.map((trip) => (
                <Link key={trip.id} href={`/trips/${trip.id}`}>
                  <div>
                    <h2>{trip.name}</h2>
                    <span className="dates">
                      {trip.destination ? `${trip.destination} · ` : ''}
                      {shortDate(trip.start_date)} – {shortDate(trip.end_date)}{' '}
                      {trip.start_date.slice(0, 4)}
                    </span>
                  </div>
                  <span className="go">Open →</span>
                </Link>
              ))}
            </div>

            <form action={seedPerthTrip} style={{ marginTop: 18 }}>
              <button className="btn sec" type="submit">
                Add another Perth 2026 trip
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
