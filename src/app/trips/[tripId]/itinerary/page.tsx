import Link from 'next/link'
import { notFound } from 'next/navigation'

import { UploadZone } from '@/components/upload-zone'
import {
  addEventForm,
  addPrepItemForm,
  removeEvent,
  removePrepItem,
  setPrepDone,
} from '@/lib/actions'
import { clockTime, dayOfMonth, fileFormat, longDate, shortDate, weekdayShort } from '@/lib/format'
import { getTripBundle } from '@/lib/load'

export default async function ItineraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>
  searchParams: Promise<{ day?: string }>
}) {
  const { tripId } = await params
  const { day: dayParam } = await searchParams

  const bundle = await getTripBundle(tripId)
  if (!bundle) notFound()

  const { days, events, prep, documents, bookings } = bundle
  if (days.length === 0) {
    return <p className="allclear">This trip has no days yet.</p>
  }

  const wanted = Number(dayParam)
  const day = days.find((d) => d.day_number === wanted) ?? days[0]

  const dayEvents = events
    .filter((e) => e.day_id === day.id)
    .sort((a, b) => {
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
      if (a.start_time) return -1
      if (b.start_time) return 1
      return a.sort_order - b.sort_order
    })

  const dayPrep = prep.filter((p) => p.day_id === day.id)
  const dayDocs = documents.filter(
    (d) =>
      d.day_id === day.id || dayEvents.some((e) => e.booking_id && e.booking_id === d.booking_id),
  )
  const uniqueDocs = Array.from(new Map(dayDocs.map((d) => [d.id, d])).values())

  const timed = dayEvents.filter((e) => e.start_time).length
  const meta = dayEvents.length
    ? `${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'} · ${
        timed === 0
          ? 'no times set yet'
          : `${uniqueDocs.length} document${uniqueDocs.length === 1 ? '' : 's'}`
      }`
    : 'Nothing planned yet'

  return (
    <>
      <div className="viewhead">
        <div>
          <h1>Itinerary</h1>
          <p className="sub">
            The day down the middle, what to bring beside it, and the paperwork it needs.
          </p>
        </div>
      </div>

      <div className="daytabs">
        {days.map((d) => (
          <Link
            key={d.id}
            href={`/trips/${tripId}/itinerary?day=${d.day_number}`}
            data-active={d.id === day.id}
          >
            {weekdayShort(d.date)}
            <b>{dayOfMonth(d.date)}</b>
            Day {d.day_number}
          </Link>
        ))}
      </div>

      <div className="daygrid">
        <div>
          <div className="dayhead">
            <h2>
              Day {day.day_number} · {longDate(day.date)}
              {day.title ? ` — ${day.title}` : ''}
            </h2>
            <p className="meta">{meta}</p>
          </div>

          {dayEvents.length === 0 ? (
            <div className="emptyday">
              <strong>No plan for this day yet</strong>
              <span>Add the first thing below and it will appear on the timeline.</span>
            </div>
          ) : (
            <ul className="tl">
              {dayEvents.map((event) => {
                const doc = documents.find(
                  (d) => event.booking_id && d.booking_id === event.booking_id,
                )
                const booking = bookings.find((b) => b.id === event.booking_id)
                const remove = removeEvent.bind(null, event.id, tripId)

                return (
                  <li key={event.id} data-doc={Boolean(doc)} data-done={event.done}>
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

                      {doc && (
                        <span style={{ display: 'block', marginTop: 8 }}>
                          {doc.storage_path ? (
                            <a
                              className="filechip"
                              href={`/api/doc/${doc.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              📎 {doc.file_name ?? doc.label}
                            </a>
                          ) : (
                            <Link className="filechip missing" href={`/trips/${tripId}/documents`}>
                              ⚠ {doc.label} — not uploaded
                            </Link>
                          )}
                        </span>
                      )}

                      {booking && !doc && (
                        <span
                          style={{
                            display: 'block',
                            marginTop: 6,
                            fontSize: 12,
                            color: 'var(--muted)',
                          }}
                        >
                          Linked to {booking.title}
                        </span>
                      )}
                    </span>
                    <form action={remove}>
                      <button
                        className="prep-del linkbtn"
                        type="submit"
                        title="Remove event"
                        style={{ color: 'var(--muted)', fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </form>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="panel" style={{ marginTop: 20 }}>
            <h3>Add to this day</h3>
            <div className="inner">
              <form action={addEventForm.bind(null, tripId, day.id)}>
                <div className="inlineform">
                  <input name="time" type="time" aria-label="Time" style={{ flex: '0 0 116px' }} />
                  <input name="title" placeholder="What happens" aria-label="Title" required />
                  <input
                    name="kind"
                    placeholder="Kind"
                    aria-label="Kind"
                    style={{ flex: '0 0 110px' }}
                  />
                </div>
                <div className="inlineform">
                  <input
                    name="note"
                    placeholder="Note — address, duration, what to expect"
                    aria-label="Note"
                  />
                  <button className="btn stamp" type="submit">
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>Things to bring &amp; prepare</h3>
            <div className="inner">
              {dayPrep.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  Nothing listed yet for this day.
                </p>
              ) : (
                <ul className="prep">
                  {dayPrep.map((item) => (
                    <li key={item.id} data-done={item.done}>
                      <form action={setPrepDone.bind(null, item.id, !item.done, tripId)}>
                        <button
                          className="box"
                          type="submit"
                          aria-label={item.done ? 'Mark not done' : 'Mark done'}
                        >
                          {item.done ? '✓' : ''}
                        </button>
                      </form>
                      <span className="label">{item.label}</span>
                      <form action={removePrepItem.bind(null, item.id, tripId)}>
                        <button className="del" type="submit" aria-label="Remove">
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <form action={addPrepItemForm.bind(null, tripId, day.id)} className="inlineform">
                <input
                  name="label"
                  placeholder="Add something to bring"
                  aria-label="New item"
                  required
                />
                <button className="btn sec" type="submit">
                  Add
                </button>
              </form>
            </div>
          </div>

          <div className="panel">
            <h3>Documents for this day</h3>
            <div className="inner">
              {uniqueDocs.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  No documents needed on this day.
                </p>
              ) : (
                <ul className="docmini">
                  {uniqueDocs.map((doc) => (
                    <li key={doc.id} data-missing={!doc.storage_path}>
                      <span className="fmt">{fileFormat(doc)}</span>
                      <span className="grow">{doc.file_name ?? doc.label}</span>
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

              <UploadZone
                tripId={tripId}
                dayId={day.id}
                neededOn={day.date}
                hint={`Clipped to ${shortDate(day.date)} automatically`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
