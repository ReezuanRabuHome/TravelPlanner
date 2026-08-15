/**
 * The Perth family holiday, transcribed from the planner PDF.
 * Used by the "Add the Perth trip" button so there is real data to work with
 * from the first login rather than an empty shell.
 */

type SeedEvent = {
  time: string | null
  title: string
  note?: string
  kind?: string
  bullets?: string[]
  booking?: string
}

type SeedDay = {
  number: number
  date: string
  title: string | null
  summary: string | null
  events: SeedEvent[]
  prep: { label: string; done?: boolean }[]
}

type SeedBooking = {
  key: string
  kind: 'flight' | 'car' | 'stay' | 'activity'
  title: string
  subtitle: string
  reference?: string
  starts_at?: string
  ends_at?: string
  details: Record<string, string>
}

type SeedDocument = {
  label: string
  booking?: string
  day?: number
  needed_on?: string | null
}

const TRIP = {
  name: 'Family Holiday Trip',
  destination: 'Perth, Australia',
  start_date: '2026-08-22',
  end_date: '2026-08-29',
  timezone: 'Australia/Perth',
  home_timezone: 'Asia/Singapore',
  travellers: 5,
}

const BOOKINGS: SeedBooking[] = [
  {
    key: 'tr8',
    kind: 'flight',
    title: 'TR 8 · Singapore → Perth',
    subtitle: 'Scoot · Boeing 787-9',
    reference: 'FB9QWW',
    starts_at: '2026-08-22T12:00:00',
    ends_at: '2026-08-22T17:10:00',
    details: {
      from: 'SIN',
      to: 'PER',
      from_terminal: 'Changi Airport T1',
      to_terminal: 'Perth Airport T1',
      duration: '5h 10m',
      cabin: 'Economy',
      fare_class: 'X',
      booked: '05 Dec 2025',
    },
  },
  {
    key: 'tr29',
    kind: 'flight',
    title: 'TR 29 · Perth → Singapore',
    subtitle: 'Scoot · Boeing 787-8',
    reference: 'FB9QWW',
    starts_at: '2026-08-29T05:35:00',
    ends_at: '2026-08-29T10:55:00',
    details: {
      from: 'PER',
      to: 'SIN',
      from_terminal: 'Perth Airport T1',
      to_terminal: 'Changi Airport T1',
      duration: '5h 20m',
      cabin: 'Economy',
      fare_class: 'X',
      note: 'Red-eye — at the airport by 03:35',
    },
  },
  {
    key: 'car',
    kind: 'car',
    title: 'Kia Carnival 2018',
    subtitle: '8-seater · plate 1GVY220',
    starts_at: '2026-08-22T18:00:00',
    ends_at: '2026-08-29T03:00:00',
    details: {
      location: 'Perth Airport',
      plate: '1GVY220',
      pickup: 'Perth Airport · Sat 22 Aug, 18:00',
      dropoff: 'Perth Airport · Sat 29 Aug, 03:00',
    },
  },
  {
    key: 'stay',
    kind: 'stay',
    title: 'Home in Scarborough',
    subtitle: 'Whole home · hosted by Michelle',
    starts_at: '2026-08-22T15:00:00',
    ends_at: '2026-08-29T10:00:00',
    details: {
      address: '6 Nautilus Place, Scarborough, Perth',
      host: 'Michelle',
      nights: '7',
    },
  },
]

const DAYS: SeedDay[] = [
  {
    number: 1,
    date: '2026-08-22',
    title: 'Fly to Perth · collect the car · settle in',
    summary: 'Flight to Perth · Collect rental car · Groceries',
    events: [
      { time: '07:00', title: 'Wake up and get ready', note: 'Prep until 08:45', kind: 'Prep' },
      { time: '08:50', title: 'Leave the house', note: 'In the cab by 09:00', kind: 'Transit' },
      {
        time: '09:00',
        title: 'Sembawang → Changi Airport T1',
        note: 'About 40 minutes by cab',
        kind: 'Transit',
      },
      {
        time: '09:45',
        title: 'Check in for TR 8',
        note: 'Passports, NRIC, check-in baggage',
        kind: 'Check-in',
        booking: 'tr8',
      },
      {
        time: '10:30',
        title: 'Breakfast at T1',
        note: 'Subway · Crave · Heavenly Wang',
        kind: 'Meal',
      },
      {
        time: '12:00',
        title: 'TR 8 · Singapore → Perth',
        note: '5h 10m · arrives 17:10 local',
        kind: 'Flight',
        booking: 'tr8',
      },
      {
        time: '18:00',
        title: 'Collect the rental car',
        note: 'Kia Carnival 2018 · Perth Airport',
        kind: 'Car',
        booking: 'car',
      },
      { time: '18:45', title: 'Drive to Scarborough', note: 'About 25 minutes', kind: 'Transit' },
      {
        time: '19:15',
        title: 'Drop luggage at the Airbnb',
        note: '6 Nautilus Place, Scarborough',
        kind: 'Stay',
        booking: 'stay',
      },
      {
        time: '20:00',
        title: 'Dinner at Sunset Market',
        note: "Meeting Kakak Malah's family",
        kind: 'Dinner',
      },
      {
        time: '21:30',
        title: 'Groceries',
        note: 'Spudshed Innaloo — the summary table said Coles instead',
        kind: 'Grocery',
      },
      { time: '22:30', title: 'Back to the Airbnb', note: 'Settle in and sleep', kind: 'Stay' },
    ],
    prep: [
      { label: 'Passports ×5', done: true },
      { label: 'NRIC ×5', done: true },
      { label: 'Check-in baggage packed' },
      { label: 'Driving licence + international permit' },
      { label: 'Save the Scoot itinerary offline' },
      { label: 'Book the airport cab the night before' },
    ],
  },
  {
    number: 2,
    date: '2026-08-23',
    title: 'Kings Park · Victoria Park · Scarborough sunset',
    summary: 'Kings Park → Victoria Park → Scarborough sunset',
    events: [
      { time: '08:00', title: 'Breakfast in Scarborough', note: 'Finish by 09:00', kind: 'Meal' },
      {
        time: '09:00',
        title: 'Leave Scarborough',
        note: 'Drive to Kings Park, about 20 minutes',
        kind: 'Transit',
      },
      {
        time: '09:30',
        title: 'Kings Park & Botanic Garden',
        note: 'Until around 12:00',
        kind: 'Sight',
        bullets: [
          'Fraser Avenue Lookout',
          'Perth skyline views',
          'Botanic Garden',
          'Lotterywest Federation Walkway',
          'Giant Boab',
          "Children's play area",
        ],
      },
      { time: '12:30', title: 'Victoria Park', note: 'Lunch along Albany Highway', kind: 'Meal' },
      {
        time: '17:00',
        title: 'Scarborough Beach for sunset',
        note: 'Sunset is around 17:45 in late August',
        kind: 'Sight',
      },
    ],
    prep: [
      { label: 'Sunscreen and hats' },
      { label: 'Water bottles' },
      { label: 'Pram for the little one' },
      { label: 'Jackets — August evenings are cold' },
    ],
  },
  {
    number: 3,
    date: '2026-08-24',
    title: 'Caversham Wildlife Park + Swan Valley',
    summary: 'Caversham Wildlife Park + Swan Valley',
    events: [
      {
        time: null,
        title: 'Caversham Wildlife Park',
        note: 'The farm show and kangaroo feeding run to a fixed schedule — worth pinning times',
        kind: 'Activity',
      },
      {
        time: null,
        title: 'Swan Valley',
        note: 'Chocolate factory, honey shop, lunch',
        kind: 'Activity',
      },
    ],
    prep: [{ label: 'Book Caversham tickets online' }, { label: 'Cash for Swan Valley stalls' }],
  },
  {
    number: 4,
    date: '2026-08-25',
    title: 'AQWA + Hillarys Boat Harbour',
    summary: 'AQWA + Hillarys Boat Harbour',
    events: [
      {
        time: null,
        title: 'AQWA — Aquarium of Western Australia',
        note: 'Inside Hillarys Boat Harbour',
        kind: 'Activity',
      },
      {
        time: null,
        title: 'Hillarys Boat Harbour',
        note: 'Lunch, playground, the beach side',
        kind: 'Activity',
      },
    ],
    prep: [{ label: 'Book AQWA tickets online' }],
  },
  {
    number: 5,
    date: '2026-08-26',
    title: 'Fremantle + Fishing Boat Harbour + Markets',
    summary: 'Fremantle + Fishing Boat Harbour + Markets',
    events: [
      {
        time: null,
        title: 'Fremantle town centre',
        note: 'Cappuccino Strip, Fremantle Prison',
        kind: 'Activity',
      },
      {
        time: null,
        title: 'Fishing Boat Harbour',
        note: 'Fish and chips by the water',
        kind: 'Meal',
      },
      {
        time: null,
        title: 'Fremantle Markets',
        note: 'Open Friday to Sunday only — and this is a Wednesday',
        kind: 'Activity',
      },
    ],
    prep: [
      { label: 'Check the markets are open midweek' },
      { label: 'Parking cash for Fremantle' },
    ],
  },
  {
    number: 6,
    date: '2026-08-27',
    title: 'Yanchep + Lancelin',
    summary: 'Yanchep + Lancelin',
    events: [
      {
        time: null,
        title: 'Yanchep National Park',
        note: 'Koalas and Crystal Cave, about 50 minutes north',
        kind: 'Activity',
      },
      {
        time: null,
        title: 'Lancelin sand dunes',
        note: 'Another 1h 10m north — sandboarding',
        kind: 'Activity',
      },
    ],
    prep: [
      { label: 'Full tank before heading north' },
      { label: 'Rent sandboards in Lancelin town' },
      { label: 'Snacks and water — long stretches with nothing' },
    ],
  },
  {
    number: 7,
    date: '2026-08-28',
    title: null,
    summary: null,
    events: [],
    prep: [
      { label: 'Pack for the 02:00 departure' },
      { label: 'Fuel the Carnival before returning it' },
    ],
  },
  {
    number: 8,
    date: '2026-08-29',
    title: 'Return the car · fly home',
    summary: 'Flight to Singapore',
    events: [
      {
        time: '02:00',
        title: 'Leave the Airbnb',
        note: 'Checkout is 10:00 but the flight goes long before — agree the key drop with Michelle',
        kind: 'Stay',
        booking: 'stay',
      },
      {
        time: '02:45',
        title: 'Drive to Perth Airport',
        note: 'About 25 minutes at that hour',
        kind: 'Transit',
      },
      {
        time: '03:00',
        title: 'Return the Kia Carnival',
        note: 'Confirm after-hours return is allowed',
        kind: 'Car',
        booking: 'car',
      },
      {
        time: '03:35',
        title: 'Check in for TR 29',
        note: 'Two hours before departure',
        kind: 'Check-in',
        booking: 'tr29',
      },
      {
        time: '05:35',
        title: 'TR 29 · Perth → Singapore',
        note: '5h 20m · arrives Changi T1 at 10:55',
        kind: 'Flight',
        booking: 'tr29',
      },
    ],
    prep: [
      { label: 'Fuel the car to the agreed level' },
      { label: 'Photograph the car at return' },
      { label: 'Passports back in hand luggage' },
    ],
  },
]

/**
 * Expected paperwork. These start as placeholders with no file behind them,
 * which is exactly the state a new trip is in — and what the Overview flags.
 */
const DOCUMENTS: SeedDocument[] = [
  { label: 'Scoot itinerary — TR 8', booking: 'tr8', day: 1, needed_on: '2026-08-22' },
  { label: 'Scoot itinerary — TR 29', booking: 'tr29', day: 8, needed_on: '2026-08-29' },
  { label: 'Airbnb confirmation', booking: 'stay', day: 1, needed_on: '2026-08-22' },
  { label: 'Rental agreement', booking: 'car', day: 1, needed_on: '2026-08-22' },
  {
    label: 'Driving licence + international permit',
    booking: 'car',
    day: 1,
    needed_on: '2026-08-22',
  },
  { label: 'Passports ×5', needed_on: null },
  { label: 'NRIC ×5', day: 1, needed_on: '2026-08-22' },
  { label: 'Travel insurance policy', needed_on: null },
]

export const PERTH_2026 = {
  trip: TRIP,
  bookings: BOOKINGS,
  days: DAYS,
  documents: DOCUMENTS,
}
