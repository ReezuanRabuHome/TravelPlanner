import { notFound } from 'next/navigation'

import { UploadZone } from '@/components/upload-zone'
import { clockTime, shortDate, stamp } from '@/lib/format'
import { getTripBundle } from '@/lib/load'
import type { Booking, TripDocument } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Booked',
  pending: 'Pending',
  balance_due: 'Balance due',
  cancelled: 'Cancelled',
}

function DocSlot({
  tripId,
  booking,
  doc,
}: {
  tripId: string
  booking: Booking
  doc: TripDocument | undefined
}) {
  if (doc?.storage_path) {
    return (
      <a className="filechip" href={`/api/doc/${doc.id}`} target="_blank" rel="noreferrer">
        📎 {doc.file_name}
      </a>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <UploadZone
        tripId={tripId}
        documentId={doc?.id}
        bookingId={booking.id}
        label={doc?.label ?? `${booking.title} paperwork`}
        neededOn={booking.starts_at?.slice(0, 10) ?? null}
        title={doc ? `Attach ${doc.label}` : 'Attach the confirmation'}
        hint="PDF, screenshot or wallet pass"
      />
    </div>
  )
}

export default async function BookingsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params
  const bundle = await getTripBundle(tripId)
  if (!bundle) notFound()

  const { bookings, documents } = bundle
  const docFor = (bookingId: string) => documents.find((d) => d.booking_id === bookingId)

  const flights = bookings.filter((b) => b.kind === 'flight')
  const others = bookings.filter((b) => b.kind !== 'flight')

  return (
    <>
      <div className="viewhead">
        <div>
          <h1>Bookings</h1>
          <p className="sub">The fixed points of the trip. Each one carries its own file.</p>
        </div>
      </div>

      {bookings.length === 0 && (
        <div className="emptyday">
          <strong>No bookings yet</strong>
          <span>Flights, car hire and stays will appear here once added.</span>
        </div>
      )}

      {flights.map((flight) => {
        const d = flight.details ?? {}
        const doc = docFor(flight.id)
        return (
          <div className="pass" key={flight.id}>
            <div className="pass-main">
              <div className="pass-air">
                <span>{flight.subtitle ?? flight.title}</span>
                <span>
                  {[d.cabin, d.fare_class ? `Fare class ${d.fare_class}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>

              <div className="pass-route">
                <span className="iata">{d.from ?? '???'}</span>
                <span className="arc" data-dur={d.duration ?? undefined} />
                <span className="iata">{d.to ?? '???'}</span>
              </div>

              <div className="pass-cities">
                <span>
                  {d.from_terminal ?? ''} · {stamp(flight.starts_at)}
                </span>
                <span>
                  {d.to_terminal ?? ''} · {stamp(flight.ends_at)}
                </span>
              </div>

              <div className="pass-facts">
                {flight.reference && (
                  <div>
                    <b>Booking ref</b>
                    <span>{flight.reference}</span>
                  </div>
                )}
                {d.booked && (
                  <div>
                    <b>Booked</b>
                    <span>{d.booked}</span>
                  </div>
                )}
                <div>
                  <b>Status</b>
                  <span>{STATUS_LABEL[flight.status] ?? flight.status}</span>
                </div>
                {d.note && (
                  <div>
                    <b>Note</b>
                    <span>{d.note}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pass-stub">
              <span className="barcode" aria-hidden="true" />
              <DocSlot tripId={tripId} booking={flight} doc={doc} />
            </div>
          </div>
        )
      })}

      {others.length > 0 && (
        <div className="cardrow" style={{ marginTop: flights.length ? 6 : 0 }}>
          {others.map((booking) => {
            const d = booking.details ?? {}
            const doc = docFor(booking.id)
            return (
              <div className="bcard" key={booking.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span className="kind">
                    {booking.kind === 'car'
                      ? 'Car hire'
                      : booking.kind === 'stay'
                        ? 'Stay'
                        : booking.kind}
                  </span>
                  <span className={`badge ${booking.status === 'confirmed' ? 'ok' : 'warn'}`}>
                    {STATUS_LABEL[booking.status] ?? booking.status}
                  </span>
                </div>

                <h3>{booking.title}</h3>
                <p>{booking.subtitle}</p>

                <dl>
                  {booking.starts_at && (
                    <>
                      <dt>{booking.kind === 'stay' ? 'Check in' : 'Pick up'}</dt>
                      <dd>
                        {shortDate(booking.starts_at)}, {clockTime(booking.starts_at)}
                      </dd>
                    </>
                  )}
                  {booking.ends_at && (
                    <>
                      <dt>{booking.kind === 'stay' ? 'Check out' : 'Return'}</dt>
                      <dd>
                        {shortDate(booking.ends_at)}, {clockTime(booking.ends_at)}
                      </dd>
                    </>
                  )}
                  {booking.reference && (
                    <>
                      <dt>Reference</dt>
                      <dd>{booking.reference}</dd>
                    </>
                  )}
                  {d.address && (
                    <>
                      <dt>Address</dt>
                      <dd>{d.address}</dd>
                    </>
                  )}
                  {d.location && !d.address && (
                    <>
                      <dt>Location</dt>
                      <dd>{d.location}</dd>
                    </>
                  )}
                  {d.host && (
                    <>
                      <dt>Host</dt>
                      <dd>{d.host}</dd>
                    </>
                  )}
                  {d.plate && (
                    <>
                      <dt>Plate</dt>
                      <dd>{d.plate}</dd>
                    </>
                  )}
                </dl>

                <div style={{ marginTop: 14 }}>
                  <DocSlot tripId={tripId} booking={booking} doc={doc} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
