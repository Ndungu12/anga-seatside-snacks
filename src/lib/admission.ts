// Simulated admissions app + SMS gateway. Admitting a ticket and sending the ordering
// SMS are separate steps, as at a real door. Shared by /admissions and the /sms phone.
import type { Booking } from "./bookings";
import { nairobiMinutes } from "./rules";
import { admissionsStore, markSmsSent, randomCode, recordAdmission, recordSms } from "./store";
import { createLinkToken, linkExpiryMs } from "./tokens";

export const fmtNairobiTime = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);

/** Simulated SMS gateway delay. */
export const SMS_SEND_MS = 1400;

export type Validation =
  | { ok: true; booking: Booking; alreadyAt: number | null }
  | { ok: false; reason: "not_found" | "ended"; booking?: Booking };

/** Door check: does the ticket exist, and is its screening still running? */
export function validateTicket(booking: Booking | undefined, now = Date.now()): Validation {
  if (!booking) return { ok: false, reason: "not_found" };
  if (nairobiMinutes(new Date(now)) > booking.screening.end)
    return { ok: false, reason: "ended", booking };
  const prior = admissionsStore.get()[booking.ref];
  return { ok: true, booking, alreadyAt: prior?.admittedAt ?? null };
}

export function admitTicket(b: Booking) {
  const prior = admissionsStore.get()[b.ref];
  if (prior) return;
  recordAdmission({ bookingRef: b.ref, admittedAt: Date.now(), token: null, expiresAt: null });
}

/**
 * Issues a fresh signed link and "sends" it. A new link replaces the previous one,
 * which stops working. Returns the token.
 */
export function sendOrderingSms(b: Booking, origin: string): string {
  const at = Date.now();
  const payload = {
    v: 1 as const,
    b: b.ref,
    s: b.screening.id,
    exp: linkExpiryMs(b.screening.end, at),
    n: randomCode(10),
  };
  const token = createLinkToken(payload);
  const link = `${origin}/t/${token}`;
  const seats = b.tickets.map((t) => t.seat).join(", ");
  const prior = admissionsStore.get()[b.ref];
  recordAdmission({
    bookingRef: b.ref,
    admittedAt: prior?.admittedAt ?? at,
    token,
    expiresAt: payload.exp,
  });
  const id = `sms-${at}-${randomCode(3)}`;
  recordSms({
    id,
    to: b.phoneMasked,
    bookingRef: b.ref,
    link,
    at,
    status: "sending",
    expiresAt: payload.exp,
    body: `Anga Cinemas: Hi ${b.customer.split(" ")[0]}, you're in for ${b.film}, Screen ${b.screen}, seat${b.tickets.length > 1 ? "s" : ""} ${seats}. Order snacks to your seat, no queue: ${link} (valid until ${fmtNairobiTime(payload.exp)})`,
  });
  window.setTimeout(() => markSmsSent(id), SMS_SEND_MS);
  return token;
}

/** One step, used by the guest-phone demo: admit at the door and send the SMS. */
export function admitBooking(b: Booking, origin: string): string {
  admitTicket(b);
  return sendOrderingSms(b, origin);
}
