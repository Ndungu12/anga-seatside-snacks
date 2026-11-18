// Builds ordering sessions from each entry point. The session is what ties a guest to
// one screening and one seat; orders always copy it, never the QR or link itself.
import type { Booking } from "./bookings";
import type { VenueId } from "./data";
import { formatClock, type EntryPoint } from "./rules";
import { FILMS, type Screening } from "./schedule";
import { attributionStore, type Session } from "./store";

export function sessionFromBooking(
  booking: Booking,
  ticket: { ref: string; seat: string },
  entryPoint: "admission_sms" | "booking_ref",
  linkToken: string | null,
): Session {
  return {
    venue: booking.venue,
    screeningId: booking.screening.id,
    film: booking.film,
    screen: String(booking.screen),
    start: booking.start,
    end: booking.end,
    seat: ticket.seat,
    entryPoint,
    verification: entryPoint === "admission_sms" ? "ticket_link" : "booking_ref",
    bookingRef: booking.ref,
    ticketRef: ticket.ref,
    ticketChannel: booking.channel,
    linkToken,
    seatCode: null,
    customerName: booking.customer,
  };
}

const GENERIC_ENTRIES: EntryPoint[] = [
  "website",
  "mpesa_miniapp",
  "promo_screen",
  "social",
  "venue_qr",
];

export function sessionFromScreening(
  venue: VenueId,
  screening: Screening,
  seat: string,
  via: { seatCode: string } | null,
): Session {
  const attributed = attributionStore.get()?.entryPoint;
  const entryPoint: EntryPoint = via
    ? "seat_qr"
    : attributed && GENERIC_ENTRIES.includes(attributed)
      ? attributed
      : "website";
  return {
    venue,
    screeningId: screening.id,
    film: FILMS[screening.filmId]!.title,
    screen: String(screening.screen),
    start: formatClock(screening.start),
    end: formatClock(screening.end),
    seat,
    entryPoint,
    verification: "unverified",
    bookingRef: null,
    ticketRef: null,
    ticketChannel: null,
    linkToken: null,
    seatCode: via?.seatCode ?? null,
    customerName: null,
  };
}
