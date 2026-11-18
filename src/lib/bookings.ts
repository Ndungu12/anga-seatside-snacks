// Mock ticket bookings, standing in for the ticketing system. Mock data only.
// Bookings sit on the demo screenings so they are always "on now" when you test.
import type { VenueId } from "./data";
import { formatClock } from "./rules";
import { FILMS, findScreening, type Screening } from "./schedule";

export type TicketChannel = "website" | "mpesa_miniapp" | "kenyabuzz" | "box_office";

export const TICKET_CHANNEL_LABEL: Record<TicketChannel, string> = {
  website: "Anga website",
  mpesa_miniapp: "M-Pesa Mini App",
  kenyabuzz: "Kenyabuzz",
  box_office: "Box office",
};

export type Booking = {
  ref: string;
  channel: TicketChannel;
  venue: VenueId;
  screening: Screening;
  film: string;
  screen: number;
  start: string;
  end: string;
  /** Seats in booking order; each has its own ticket reference. */
  tickets: { ref: string; seat: string }[];
  customer: string;
  phoneMasked: string;
  phoneLast3: string;
  /** Concessions bought with the ticket, as printed on the e-ticket */
  concessions: { name: string; qty: number; price: number }[];
  /** Ticket + concessions total, KES */
  total: number;
};

type Seed = {
  ref: string;
  channel: TicketChannel;
  venue: VenueId;
  /** Offset from the current half hour, in minutes. +10 is the demo screening that is always on. */
  startOffset: number;
  seats: string[];
  customer: string;
  phone: string;
  concessions?: { name: string; qty: number; price: number }[];
  total: number;
};

const SEEDS: Seed[] = [
  // Mirrors the sample Anga e-ticket (illustrative, not a live record).
  {
    ref: "ANGA-93941518",
    channel: "website",
    venue: "diamond",
    startOffset: 10,
    seats: ["D11"],
    customer: "John Ndungu",
    phone: "0711222518",
    concessions: [{ name: "Aquamist 500ml", qty: 1, price: 170 }],
    total: 970,
  },
  {
    ref: "AGB-48213",
    channel: "website",
    venue: "sky",
    startOffset: 10,
    seats: ["F7", "F8"],
    customer: "Wanjiru Kamau",
    phone: "0712345678",
    total: 1600,
  },
  {
    ref: "MP-90311",
    channel: "mpesa_miniapp",
    venue: "sky",
    startOffset: 10,
    seats: ["D11"],
    customer: "Brian Otieno",
    phone: "0722111104",
    total: 800,
  },
  {
    ref: "KB-77204",
    channel: "kenyabuzz",
    venue: "diamond",
    startOffset: 10,
    seats: ["H3", "H4", "H5"],
    customer: "Achieng Mwangi",
    phone: "0701990552",
    concessions: [{ name: "Salted Popcorn (Medium)", qty: 2, price: 600 }],
    total: 3000,
  },
  {
    ref: "AGB-31007",
    channel: "website",
    venue: "sky",
    startOffset: -200,
    seats: ["B2"],
    customer: "James Kamau",
    phone: "0733456219",
    total: 800,
  },
];

function mask(phone: string): string {
  return `${phone.slice(0, 4)} *** ${phone.slice(-3)}`;
}

export function getBookings(nowMinutes: number): Booking[] {
  const anchor = Math.floor(nowMinutes / 30) * 30;
  const out: Booking[] = [];
  for (const seed of SEEDS) {
    const screening = findScreening(
      `${seed.venue}.1.demo-rains.${anchor + seed.startOffset}`,
      nowMinutes,
    );
    if (!screening) continue;
    out.push({
      ref: seed.ref,
      channel: seed.channel,
      venue: seed.venue,
      screening,
      film: FILMS[screening.filmId]!.title,
      screen: screening.screen,
      start: formatClock(screening.start),
      end: formatClock(screening.end),
      tickets: seed.seats.map((seat, i) => ({ ref: `${seed.ref}-T${i + 1}`, seat })),
      customer: seed.customer,
      phoneMasked: mask(seed.phone),
      phoneLast3: seed.phone.slice(-3),
      concessions: seed.concessions ?? [],
      total: seed.total,
    });
  }
  return out;
}

export function findBooking(ref: string, nowMinutes: number): Booking | undefined {
  const key = ref.trim().toUpperCase();
  return getBookings(nowMinutes).find((b) => b.ref === key || b.tickets.some((t) => t.ref === key));
}

/** The booking for a screening id carried in a signed link (the screening may have moved on). */
export function bookingForLink(
  ref: string,
  screeningId: string,
  nowMinutes: number,
): Booking | undefined {
  const base = findBooking(ref, nowMinutes);
  const screening = findScreening(screeningId, nowMinutes);
  if (!base || !screening) return undefined;
  return {
    ...base,
    screening,
    film: FILMS[screening.filmId]!.title,
    screen: screening.screen,
    start: formatClock(screening.start),
    end: formatClock(screening.end),
  };
}
