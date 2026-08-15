import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buildFlags } from '@/lib/flags'
import { dayOfMonth, longDate, weekdayShort } from '@/lib/format'
import { getTripBundle } from '@/lib/load'

export default async function OverviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params
  const bundle = await getTripBundle(tripId)
  if (!bundle) notFound()

  const { trip, days, events, bookings, prep, documents } = bundle
  const flags = buildFlags(bundle)

  const plannedDays = days.filter((d) => events.some((e) => e.day_id === d.id)).length
  const uploaded = documents.filter((d) => d.storage_path).length
  const daysWithPrep = new Set(prep.map((p) => p.day_id).filter(Boolean)).size

  const flightCount = bookings.filter((b) => b.kind === 'flight').length
  const carCount = bookings.filter((b) => b.kind === 'car').length
  const stayCount = bookings.filter((b) => b.kind === 'stay').length

  return (
    <>
      <div className="viewhead">
        <div>
          <h1>
            {trip.destination ?? trip.name}, {longDate(trip.start_date)} – {longDate(trip.end_date)}
          </h1>
          <p className="sub">
            {trip.travellers} travellers ·{' '}
            {bookings
              .map((b) => b.title)
              .slice(0, 3)
              .join(' · ') || 'No bookings yet'}
          </p>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <b>Days planned</b>
          <div className="big">
            {plannedDays} / {days.length}
          </div>
          <p className="foot">
            {plannedDays === days.length
              ? 'Every day has something on it'
              : `${days.length - plannedDays} still empty`}
          </p>
        </div>
        <div className="tile">
          <b>Bookings</b>
          <div className="big">{bookings.length}</div>
          <p className="foot">
            {[
              flightCount ? `${flightCount} flight${flightCount > 1 ? 's' : ''}` : null,
              carCount ? `${carCount} car` : null,
              stayCount ? `${stayCount} stay${stayCount > 1 ? 's' : ''}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Nothing booked yet'}
          </p>
        </div>
        <div className="tile">
          <b>Documents on file</b>
          <div className="big">
            {uploaded} / {documents.length}
          </div>
          <p className="foot">
            {uploaded === documents.length
              ? 'All present and cached'
              : `${documents.length - uploaded} still to upload`}
          </p>
        </div>
        <div className="tile">
          <b>Prep lists filled</b>
          <div className="big">
            {daysWithPrep} / {days.length}
          </div>
          <p className="foot">Things to bring, per day</p>
        </div>
      </div>

      <p className="sechead">Needs your attention</p>
      {flags.length === 0 ? (
        <p className="allclear">
          Nothing outstanding. Every day has a plan, every booking has its paperwork, and all of it
          is cached.
        </p>
      ) : (
        <ul className="attention">
          {flags.map((flag, i) => (
            <li key={i} data-level={flag.level}>
              <span className="lvl">{flag.level}</span>
              <span className="grow">
                <strong>{flag.title}</strong>
                <em>{flag.detail}</em>
              </span>
              {flag.href && (
                <Link className="fix" href={flag.href}>
                  {flag.action ?? 'Open'}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="sechead">The {days.length} days</p>
      <div className="strip">
        {days.map((day) => {
          const count = events.filter((e) => e.day_id === day.id).length
          return (
            <Link
              key={day.id}
              href={`/trips/${tripId}/itinerary?day=${day.day_number}`}
              className={count === 0 ? 'empty' : undefined}
            >
              <span className="d">{weekdayShort(day.date)}</span>
              <span className="dd">{dayOfMonth(day.date)}</span>
              <span className="t">
                {count === 0 ? 'Nothing planned' : (day.summary ?? day.title ?? `${count} events`)}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
