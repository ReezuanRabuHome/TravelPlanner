/**
 * Dates and times in this app are wall-clock values, not instants:
 *   - `date` columns arrive as 'YYYY-MM-DD'
 *   - `timestamp` columns arrive as 'YYYY-MM-DDTHH:MM:SS'
 *
 * Both are read as plain strings rather than pushed through `new Date()` with a
 * local offset, which is how "checkout 10:00" quietly becomes 02:00 for someone
 * loading the page from another timezone.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** 'YYYY-MM-DD' → a Date fixed at UTC midnight, safe for weekday arithmetic. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** 'YYYY-MM-DD' → 'Saturday 22 August' */
export function longDate(iso: string): string {
  const d = parseDate(iso)
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/** 'YYYY-MM-DD' → '22 Aug' */
export function shortDate(iso: string): string {
  const d = parseDate(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`
}

/** 'YYYY-MM-DD' → 'SAT' */
export function weekdayShort(iso: string): string {
  return DAYS[parseDate(iso).getUTCDay()].slice(0, 3).toUpperCase()
}

/** 'YYYY-MM-DD' → '22' */
export function dayOfMonth(iso: string): string {
  return String(parseDate(iso).getUTCDate())
}

/** '18:00:00' or '2026-08-22T18:00:00' → '18:00' */
export function clockTime(value: string | null | undefined): string {
  if (!value) return '—'
  const t = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5)
  return t || '—'
}

/** Hour of day as a number, straight off the string. */
export function hourOf(value: string): number {
  return Number((value.includes('T') ? value.slice(11, 13) : value.slice(0, 2)) || 0)
}

/** Minutes since midnight, for ordering and comparison. */
export function minutesOf(value: string | null | undefined): number | null {
  if (!value) return null
  const t = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5)
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/** '2026-08-22T18:00:00' → '22 Aug, 18:00' */
export function stamp(value: string | null | undefined): string {
  if (!value) return '—'
  return `${shortDate(value)}, ${clockTime(value)}`
}

/** Whole days from a to b, both 'YYYY-MM-DD'. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
}

/** Today, as 'YYYY-MM-DD' in a given IANA timezone. */
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Current wall clock in a given IANA timezone, as 'HH:MM'. */
export function nowIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function fileFormat(doc: { file_name: string | null; mime_type: string | null }): string {
  if (!doc.file_name) return '—'
  const ext = doc.file_name.split('.').pop()
  return (ext ?? '—').toUpperCase().slice(0, 4)
}
