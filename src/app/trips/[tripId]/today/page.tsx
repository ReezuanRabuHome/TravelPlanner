import Link from 'next/link'
import { notFound } from 'next/navigation'

import { clockTime, fileFormat, longDate, minutesOf, nowIn, todayIn } from '@/lib/format'
import { getTripBundle } from '@/lib/load'

export default async function TodayPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params
  const bundle = await getTripBundle(tripId)
  if (!bundle) notFound()

  const { trip, days, events, documents, bookings } = bundle

  const today = todayIn(trip.timezone)
  const now = nowIn(trip.timezone)
  const nowMinutes = minutesOf(now) ?? 0

  // The day we are on, or the next one coming up if the trip has not started.
  const liveDay = days.find((d) => d.date === today)
  const day = liveDay ?? days.find((d) => d.date > today) ?? days[days.length - 1]
  const isLive = Boolean(liveDay)

  if (!day) return <p className="allclear">This trip has no days yet.</p>

  const dayEvents = events
    .filter((e) => e.day_id === day.id)
    .sort((a, b) => {
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
      if (a.start_time) return -1
      if (b.start_time) return 1
      return a.sort_order - b.sort_order
    })

  const upcoming = isLive
    ? dayEvents.find((e) => e.start_time && (minutesOf(e.start_time) ?? 0) >= nowMinutes)
    : dayEvents[0]
  const next = upcoming ?? dayEvents[dayEvents.length - 1]

  const minutesAway =
    isLive && next?.start_time ? (minutesOf(next.start_time) ?? 0) - nowMinutes : null

  const booking = bookings.find((b) => b.id === next?.booking_id)

  // What this specific moment needs: the booking's own paperwork, plus anything
  // that travels with you every day.
  const bringNow = documents.filter(
    (d) =>
      (next?.booking_id && d.booking_id === next.booking_id) ||
      (d.needed_on === null && !d.booking_id),
  )

  const todaysDocs = documents.filter(
    (d) =>
      d.needed_on === day.date ||
      d.day_id === day.id ||
      (d.needed_on === null && !d.booking_id) ||
      dayEvents.some((e) => e.booking_id && e.booking_id === d.booking_id),
  )
  const uniqueToday = Array.from(new Map(todaysDocs.map((d) => [d.id, d])).values())
  const cached = uniqueToday.filter((d) => d.storage_path).length

  const tomorrow = days.find((d) => d.day_number === day.day_number + 1)
  const stay = bookings.find((b) => b.kind === 'stay')

  return (
    <>
      <div className="viewhead">
        <div>
          <h1>
            Day {day.day_number} · {longDate(day.date)}
          </h1>
          <p className="sub">
            {isLive
              ? `${trip.destination ?? 'Local'} time ${now} · day ${day.day_number} of ${days.length}`
              : `Not travelling yet — this is what the screen will show on ${longDate(day.date)}`}
          </p>
        </div>
        <Link className="btn sec" href={`/trips/${tripId}/itinerary?day=${day.day_number}`}>
          Edit this day
        </Link>
      </div>

      <div className="todaygrid">
        <div>
          {next ? (
            <div className="now">
              <div className="now-strip">
                <i className="pulse" />
                {minutesAway === null
                  ? 'First thing on this day'
                  : minutesAway < 0
                    ? 'Happening now'
                    : minutesAway === 0
                      ? 'Right now'
                      : minutesAway < 60
                        ? `Next up · in ${minutesAway} minutes`
                        : `Next up · in ${Math.floor(minutesAway / 60)}h ${minutesAway % 60}m`}
              </div>
              <div className="now-body">
                <h2>{next.title}</h2>
                <p className="when">
                  {clockTime(next.start_time)}
                  {booking ? ` · ${booking.title}` : ''}
                  {booking?.details?.location ? ` · ${booking.details.location}` : ''}
                  {booking?.details?.address ? ` · ${booking.details.address}` : ''}
                </p>
                {next.note && <p className="desc">{next.note}</p>}

                {bringNow.length > 0 && (
                  <div className="bring">
                    <p>Bring this</p>
                    <ul>
                      {bringNow.map((doc) =>
                        doc.storage_path ? (
                          <li key={doc.id}>
                            <a href={`/api/doc/${doc.id}`} target="_blank" rel="noreferrer">
                              <span className="fmt">{fileFormat(doc)}</span> {doc.label}
                            </a>
                          </li>
                        ) : (
                          <li key={doc.id}>
                            <span>⚠ {doc.label} — not uploaded</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="emptyday">
              <strong>Nothing scheduled for this day</strong>
              <span>An open day is allowed. Add something if you would rather not wing it.</span>
            </div>
          )}

          <p className="sechead">
            {isLive ? 'Rest of today' : `Everything on ${longDate(day.date)}`}
          </p>
          {dayEvents.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>No events on this day.</p>
          ) : (
            <ul className="upnext">
              {dayEvents.map((event) => {
                const mins = minutesOf(event.start_time)
                const past = isLive && mins !== null && mins < nowMinutes
                return (
                  <li key={event.id} data-past={past} data-current={event.id === next?.id}>
                    <time>{clockTime(event.start_time)}</time>
                    <span>
                      <strong style={{ fontWeight: 600 }}>{event.title}</strong>
                      {event.note && <em>{event.note}</em>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="panel">
            <h3>Documents you need today</h3>
            <div className="inner">
              {uniqueToday.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  Nothing needed today.
                </p>
              ) : (
                <ul className="docmini">
                  {uniqueToday.map((doc) => (
                    <li key={doc.id} data-missing={!doc.storage_path}>
                      <span className="fmt">{fileFormat(doc)}</span>
                      <span className="grow">{doc.label}</span>
                      {doc.storage_path ? (
                        <a
                          className="linkbtn"
                          href={`/api/doc/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : (
                        <em>missing</em>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="offline" data-partial={cached < uniqueToday.length}>
                <i />
                {cached} of {uniqueToday.length} available offline
              </p>
            </div>
          </div>

          {tomorrow && (
            <div className="panel">
              <h3>Tomorrow</h3>
              <div className="inner" style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
                <strong
                  style={{ display: 'block', fontSize: 15.5, color: 'var(--ink)', marginBottom: 4 }}
                >
                  {tomorrow.title ?? 'Nothing planned yet'}
                </strong>
                {tomorrow.summary ??
                  (events.some((e) => e.day_id === tomorrow.id)
                    ? 'See the itinerary for the detail.'
                    : 'An open day — worth deciding tonight.')}
              </div>
            </div>
          )}

          {stay && (
            <div className="panel">
              <h3>Where you are staying</h3>
              <div className="inner" style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
                <strong
                  style={{ display: 'block', fontSize: 15.5, color: 'var(--ink)', marginBottom: 2 }}
                >
                  {stay.title}
                </strong>
                {stay.details?.address}
                {stay.details?.host ? <br /> : null}
                {stay.details?.host ? `Host: ${stay.details.host}` : null}
                {stay.ends_at ? (
                  <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 12 }}>
                    Check out {clockTime(stay.ends_at)}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
