export type BookingKind = 'flight' | 'car' | 'stay' | 'activity' | 'other'
export type BookingStatus = 'confirmed' | 'pending' | 'balance_due' | 'cancelled'

export type Trip = {
  id: string
  owner_id: string
  name: string
  destination: string | null
  start_date: string
  end_date: string
  timezone: string
  home_timezone: string
  travellers: number
  created_at: string
}

export type TripDay = {
  id: string
  trip_id: string
  day_number: number
  date: string
  title: string | null
  summary: string | null
}

export type Booking = {
  id: string
  trip_id: string
  kind: BookingKind
  title: string
  subtitle: string | null
  reference: string | null
  status: BookingStatus
  starts_at: string | null
  ends_at: string | null
  details: Record<string, string>
  sort_order: number
}

export type TripEvent = {
  id: string
  trip_id: string
  day_id: string
  start_time: string | null
  end_time: string | null
  title: string
  note: string | null
  kind: string | null
  bullets: string[]
  booking_id: string | null
  sort_order: number
  done: boolean
}

export type PrepItem = {
  id: string
  trip_id: string
  day_id: string | null
  label: string
  done: boolean
  sort_order: number
}

export type TripDocument = {
  id: string
  trip_id: string
  day_id: string | null
  booking_id: string | null
  label: string
  file_name: string | null
  storage_path: string | null
  mime_type: string | null
  size_bytes: number | null
  needed_on: string | null
  created_at: string
}

export type ShareLink = {
  id: string
  trip_id: string
  token: string
  label: string | null
  revoked: boolean
  expires_at: string | null
  created_at: string
  last_seen: string | null
}

/** Everything one trip needs, loaded in a single round trip. */
export type TripBundle = {
  trip: Trip
  days: TripDay[]
  events: TripEvent[]
  bookings: Booking[]
  prep: PrepItem[]
  documents: TripDocument[]
}

/** A problem worth surfacing on the Overview screen. */
export type Flag = {
  level: 'missing' | 'check' | 'empty' | 'conflict'
  title: string
  detail: string
  href?: string
  action?: string
}
