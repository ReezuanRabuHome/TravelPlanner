import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { NavLink } from '@/components/nav-link'
import { ModeSwitch } from '@/components/mode-switch'
import { buildFlags } from '@/lib/flags'
import { daysBetween, shortDate, todayIn } from '@/lib/format'
import { getTripBundle } from '@/lib/load'
import { getUser } from '@/lib/supabase/server'

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  const { tripId } = await params
  const bundle = await getTripBundle(tripId)
  if (!bundle) notFound()

  const { trip, days, bookings, documents } = bundle
  const flags = buildFlags(bundle)
  const alerts = flags.filter((f) => f.level === 'missing').length

  const today = todayIn(trip.home_timezone)
  const until = daysBetween(today, trip.start_date)
  const past = daysBetween(trip.end_date, today) > 0
  const onTrip = until <= 0 && !past

  const base = `/trips/${tripId}`

  return (
    <div className="app-frame">
      <div className="topbar">
        <Link href="/trips" className="brand">
          <span className="glyph" aria-hidden="true">
            ✦
          </span>{' '}
          Boarding Pass
        </Link>
        <span className="tripchip">
          {trip.name}
          {trip.destination ? ` · ${trip.destination}` : ''}{' '}
          <span>
            {shortDate(trip.start_date)}–{shortDate(trip.end_date)} {trip.end_date.slice(0, 4)} ·{' '}
            {days.length} days
          </span>
        </span>
        <ModeSwitch base={base} />
      </div>

      <div className="shell">
        <nav className="side">
          <p>Planning</p>
          <NavLink href={base} exact>
            Overview
            {alerts > 0 && <span className="n alert">{alerts}</span>}
          </NavLink>
          <NavLink href={`${base}/itinerary`}>
            Itinerary <span className="n">{days.length}d</span>
          </NavLink>
          <NavLink href={`${base}/bookings`}>
            Bookings <span className="n">{bookings.length}</span>
          </NavLink>
          <NavLink href={`${base}/documents`}>
            Documents <span className="n">{documents.length}</span>
          </NavLink>

          <p>On the trip</p>
          <NavLink href={`${base}/today`}>Today</NavLink>

          <p>Family</p>
          <NavLink href={`${base}/share`}>Share links</NavLink>

          <div className="countdown">
            <b>{past ? '—' : onTrip ? 'Now' : until}</b>
            <span>
              {past
                ? 'trip finished'
                : onTrip
                  ? 'you are travelling'
                  : until === 1
                    ? 'day to departure'
                    : 'days to departure'}
            </span>
          </div>
        </nav>

        <main className="view">{children}</main>
      </div>
    </div>
  )
}
