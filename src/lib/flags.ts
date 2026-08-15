import { clockTime, daysBetween, hourOf, longDate, minutesOf, shortDate, todayIn } from './format'
import type { Flag, TripBundle } from './types'

/**
 * Everything a static itinerary cannot tell you.
 *
 * This is the argument for the app over a PDF: the plan is data, so it can be
 * checked. Each rule below came from a real failure mode — a document you only
 * discover is missing at the rental counter, a day nobody filled in, a checkout
 * time you sail past at 2am.
 */
export function buildFlags(bundle: TripBundle): Flag[] {
  const { trip, days, events, bookings, prep, documents } = bundle
  const flags: Flag[] = []
  const base = `/trips/${trip.id}`

  // ---------------------------------------------------------- missing documents
  for (const doc of documents.filter((d) => !d.storage_path)) {
    const booking = bookings.find((b) => b.id === doc.booking_id)
    const when = doc.needed_on ? shortDate(doc.needed_on) : 'every day'
    flags.push({
      level: 'missing',
      title: `${doc.label} not uploaded`,
      detail: booking
        ? `Needed ${when} — ${booking.title}`
        : `Needed ${when}${doc.needed_on ? '' : ' · trip-wide document'}`,
      href: `${base}/documents`,
      action: 'Upload',
    })
  }

  // ---------------------------------------------------------- flights with no paperwork
  for (const flight of bookings.filter((b) => b.kind === 'flight')) {
    const attached = documents.some((d) => d.booking_id === flight.id && d.storage_path)
    if (!attached) {
      flags.push({
        level: 'missing',
        title: `Nothing attached to ${flight.title}`,
        detail: 'E-tickets should be cached on the device before you fly.',
        href: `${base}/bookings`,
        action: 'Attach',
      })
    }
  }

  // ---------------------------------------------------------- empty days
  for (const day of days) {
    if (events.some((e) => e.day_id === day.id)) continue
    flags.push({
      level: 'empty',
      title: `${longDate(day.date)} has nothing planned`,
      detail:
        day.day_number === days.length - 1
          ? 'Your last full day is still open.'
          : 'No events on this day yet.',
      href: `${base}/itinerary?day=${day.day_number}`,
      action: 'Plan it',
    })
  }

  // ---------------------------------------------------------- outline-only days
  const outline = days.filter((day) => {
    const own = events.filter((e) => e.day_id === day.id)
    return own.length > 0 && own.every((e) => !e.start_time)
  })

  if (outline.length) {
    flags.push({
      level: 'check',
      title: `${outline.length} ${outline.length === 1 ? 'day is' : 'days are'} an outline with no times set`,
      detail: outline.map((d) => shortDate(d.date)).join(' · '),
      href: `${base}/itinerary?day=${outline[0].day_number}`,
      action: 'Add times',
    })
  }

  // ---------------------------------------------------------- leaving before checkout
  const stay = bookings.find((b) => b.kind === 'stay' && b.ends_at)
  if (stay?.ends_at) {
    const checkoutDate = stay.ends_at.slice(0, 10)
    const checkoutMinutes = minutesOf(stay.ends_at)
    const lastDay = days.find((d) => d.date === checkoutDate)
    const firstMove = lastDay
      ? events
          .filter((e) => e.day_id === lastDay.id && e.start_time)
          .sort((a, b) => (minutesOf(a.start_time) ?? 0) - (minutesOf(b.start_time) ?? 0))[0]
      : undefined
    const departure = minutesOf(firstMove?.start_time)

    if (departure !== null && checkoutMinutes !== null && departure < checkoutMinutes - 60) {
      flags.push({
        level: 'check',
        title: 'You leave well before checkout time on the last day',
        detail: `First move is ${clockTime(firstMove!.start_time)} but checkout is ${clockTime(
          stay.ends_at,
        )} — agree a key drop with the host.`,
        href: `${base}/bookings`,
        action: 'Review',
      })
    }
  }

  // ---------------------------------------------------------- awkward-hours car return
  const car = bookings.find((b) => b.kind === 'car' && b.ends_at)
  if (car?.ends_at) {
    const hour = hourOf(car.ends_at)
    if (hour >= 22 || hour < 6) {
      flags.push({
        level: 'check',
        title: `Car goes back at ${clockTime(car.ends_at)} — confirm after-hours return`,
        detail: `${car.title}${
          car.details?.location ? ` at ${car.details.location}` : ''
        }. Not every desk is staffed at that hour.`,
        href: `${base}/bookings`,
        action: 'Review',
      })
    }
  }

  // ---------------------------------------------------------- blank prep columns
  const withPrep = new Set(prep.map((p) => p.day_id).filter(Boolean))
  const blank = days.filter((d) => !withPrep.has(d.id))
  if (blank.length > days.length / 2) {
    flags.push({
      level: 'empty',
      title: `"Things to bring" is blank on ${blank.length} of ${days.length} days`,
      detail: 'The column exists so it gets filled in before you are standing at the door.',
      href: `${base}/itinerary?day=${blank[0].day_number}`,
      action: 'Fill it in',
    })
  }

  // ---------------------------------------------------------- countdown pressure
  const until = daysBetween(todayIn(trip.home_timezone), trip.start_date)
  const stillMissing = flags.filter((f) => f.level === 'missing').length
  if (until > 0 && until <= 21 && stillMissing > 0) {
    flags.unshift({
      level: 'check',
      title: `${until} ${until === 1 ? 'day' : 'days'} to departure with ${stillMissing} document${
        stillMissing === 1 ? '' : 's'
      } still missing`,
      detail: 'Upload them while you are still at home with good wifi and a printer.',
      href: `${base}/documents`,
      action: 'Open documents',
    })
  }

  const order = { missing: 0, check: 1, conflict: 2, empty: 3 } as const
  return flags.sort((a, b) => order[a.level] - order[b.level])
}
