import { notFound } from 'next/navigation'

import { loadTrip, resolveShareToken } from '@/lib/data'
import {
  clockTime,
  dayOfMonth,
  fileFormat,
  longDate,
  minutesOf,
  nowIn,
  shortDate,
  todayIn,
  weekdayShort,
} from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Trip · Boarding Pass' }
export const dynamic = 'force-dynamic'

/**
 * The family view. No account, no editing — the itinerary and its documents,
 * read-only, gated on a token that the owner can revoke at any time.
 */
export default async function SharedTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ day?: string }>
}) {
  const { token } = await params
  const { day: dayParam } = await searchParams

  const admin = createAdminClient()
  const link = await resolveShareToken(admin, token)
  if (!link) notFound()

  const bundle = await loadTrip(admin, link.trip_id)
  if (!bundle) notFound()

  void admin.from('share_links').update({ last_seen: new Date().toISOString() }).eq('id', link.id)

  const { trip, days, events, documents, bookings } = bundle
  const today = todayIn(trip.timezone)

  const requested = Number(dayParam)
  const day =
    days.find((d) => d.day_number === requested) ??
    days.find((d) => d.date === today) ??
    days.find((d) => d.date >= today) ??
    days[0]

  const dayEvents = events
    .filter((e) => e.day_id === day?.id)
    .sort((a, b) => {
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
      if (a.start_time) return -1
      if (b.start_time) return 1
      return a.sort_order - b.sort_order
    })

  const dayDocs = Array.from(
    new Map(
      documents
        .filter(
          (d) =>
            d.storage_path &&
            (d.day_id === day?.id ||
              d.needed_on === null ||
              dayEvents.some((e) => e.booking_id && e.booking_id === d.booking_id)),
        )
        .map((d) => [d.id, d]),
    ).values(),
  )

  const isToday = day?.date === today
  const nowMinutes = minutesOf(nowIn(trip.timezone)) ?? 0

  return (
    <div className="app-frame">
      <div className="topbar" style={{ borderRadius: '12px 12px 0 0' }}>
        <span className="brand">
          <span className="glyph" aria-hidden="true">
            ✦
          </span>{' '}
          Boarding Pass
        </span>
        <span className="tripchip">
          {trip.name}
          {trip.destination ? ` · ${trip.destination}` : ''}{' '}
          <span>
            {shortDate(trip.start_date)}–{shortDate(trip.end_date)} {trip.end_date.slice(0, 4)}
          </span>
        </span>
      </div>

      <div className="shell" style={{ gridTemplateColumns: '1fr' }}>
        <main className="view">
          <p className="readonly-banner">
            👀 Shared with you{link.label ? ` · ${link.label}` : ''} — you can read the plan and
            open documents, but not change anything.
          </p>

          <div className="daytabs">
            {days.map((d) => (
              <a
                key={d.id}
                href={`/share/${token}?day=${d.day_number}`}
                data-active={d.id === day?.id}
              >
                {weekdayShort(d.date)}
                <b>{dayOfMonth(d.date)}</b>
                Day {d.day_number}
              </a>
            ))}
          </div>

          {day && (
            <div className="daygrid">
              <div>
                <div className="dayhead">
                  <h2>
                    {longDate(day.date)}
                    {day.title ? ` — ${day.title}` : ''}
                  </h2>
                  <p className="meta">
                    Day {day.day_number} of {days.length}
                    {isToday ? ' · today' : ''}
                  </p>
                </div>

                {dayEvents.length === 0 ? (
                  <div className="emptyday">
                    <strong>Nothing planned for this day</strong>
                    <span>A free day.</span>
                  </div>
                ) : (
                  <ul className="tl">
                    {dayEvents.map((event) => {
                      const mins = minutesOf(event.start_time)
                      const past = isToday && mins !== null && mins < nowMinutes
                      return (
                        <li key={event.id} data-done={past}>
                          <time>{clockTime(event.start_time)}</time>
                          <span className="body">
                            <strong>
                              {event.title}
                              {event.kind && <span className="kind">{event.kind}</span>}
                            </strong>
                            {event.note && <span className="note">{event.note}</span>}
                            {event.bullets.length > 0 && (
                              <ul className="bullets">
                                {event.bullets.map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div>
                <div className="panel">
                  <h3>Documents for this day</h3>
                  <div className="inner">
                    {dayDocs.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                        Nothing attached to this day yet.
                      </p>
                    ) : (
                      <ul className="docmini">
                        {dayDocs.map((doc) => (
                          <li key={doc.id}>
                            <span className="fmt">{fileFormat(doc)}</span>
                            <span className="grow">{doc.label}</span>
                            <a
                              className="linkbtn"
                              href={`/share/${token}/doc/${doc.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {bookings.length > 0 && (
                  <div className="panel">
                    <h3>Bookings</h3>
                    <div className="inner">
                      <ul className="docmini">
                        {bookings.map((b) => (
                          <li key={b.id}>
                            <span className="grow">
                              <strong style={{ fontWeight: 600 }}>{b.title}</strong>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                {b.starts_at
                                  ? `${shortDate(b.starts_at)}, ${clockTime(b.starts_at)}`
                                  : ''}
                                {b.reference ? ` · ${b.reference}` : ''}
                              </div>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
