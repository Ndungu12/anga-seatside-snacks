// Business rules for Anga Seat Order. Pure functions, covered by src/test/rules.test.ts.

/** Ordering closes this many minutes before the film ends. Change it here only. */
export const ORDER_CUTOFF_MINUTES = 20;

/** Most of one item a guest can add. */
export const MAX_QTY_PER_ITEM = 10;

/** How long the simulated M-Pesa prompt takes before it resolves. */
export const PAYMENT_WAIT_MS = 4000;

// ---- Order lifecycle ----
// PENDING_PAYMENT → PAID → ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED,
// with side states for payment failure, cancellation and refunds.

export const FULFILMENT_FLOW = [
  "paid",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
] as const;
export type FulfilmentStatus = (typeof FULFILMENT_FLOW)[number];
export type OrderStatus =
  | "pending_payment"
  | FulfilmentStatus
  | "payment_failed"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for delivery",
  out_for_delivery: "On its way",
  delivered: "Delivered",
  payment_failed: "Payment failed",
  cancelled: "Cancelled",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

/** Guest-facing wording for each fulfilment step. */
export const GUEST_STEP_TEXT: Record<FulfilmentStatus, string> = {
  paid: "Payment confirmed. The kiosk has your order.",
  accepted: "The kiosk has accepted your order.",
  preparing: "Your snacks are being made.",
  ready: "Packed and waiting for a runner.",
  out_for_delivery: "A runner is bringing it to your seat.",
  delivered: "Enjoy the film.",
};

/** The four steps a guest sees while tracking (several internal statuses share a step). */
export const GUEST_TRACK: {
  id: string;
  label: string;
  statuses: FulfilmentStatus[];
  text: string;
}[] = [
  {
    id: "received",
    label: "Order received",
    statuses: ["paid", "accepted"],
    text: "Payment confirmed. The kiosk has your order.",
  },
  {
    id: "preparing",
    label: "Preparing",
    statuses: ["preparing"],
    text: "Your snacks are being made fresh.",
  },
  {
    id: "ready",
    label: "Ready for delivery",
    statuses: ["ready", "out_for_delivery"],
    text: "Packed and on its way to your seat.",
  },
  { id: "delivered", label: "Delivered", statuses: ["delivered"], text: "Enjoy the film." },
];

/** Index into GUEST_TRACK for an order status, or -1 when the order isn't in fulfilment. */
export function guestStepIndex(status: OrderStatus): number {
  return GUEST_TRACK.findIndex((s) => (s.statuses as string[]).includes(status));
}

/** The next fulfilment step, or null when there is none (or the order isn't paid yet). */
export function nextStatus(status: OrderStatus): FulfilmentStatus | null {
  const i = FULFILMENT_FLOW.indexOf(status as FulfilmentStatus);
  if (i < 0) return null;
  return FULFILMENT_FLOW[i + 1] ?? null;
}

/** Staff button label for moving an order on from `status`. */
export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  paid: "Accept order",
  accepted: "Mark as preparing",
  preparing: "Mark as ready",
  ready: "Runner collected",
  out_for_delivery: "Mark as delivered",
};

/** Guests can cancel only before the kiosk starts preparing. */
export function canCancel(status: OrderStatus): boolean {
  return status === "paid" || status === "accepted" || status === "pending_payment";
}

/** Staff can cancel (and refund) any paid order that hasn't left the kiosk. */
export function canStaffCancel(status: OrderStatus): boolean {
  return status === "paid" || status === "accepted" || status === "preparing" || status === "ready";
}

/** Orders that still need attention from the kiosk or the guest. */
export function isOpenOrder(status: OrderStatus): boolean {
  return !["delivered", "cancelled", "refunded", "refund_pending"].includes(status);
}

/**
 * Guard against two staff (or two tabs) processing the same order: a transition only
 * applies when the order is still in the status the staff member was looking at.
 */
export function canTransition(
  current: OrderStatus,
  expectedFrom: OrderStatus,
  to: OrderStatus,
): boolean {
  if (current !== expectedFrom) return false;
  if (to === nextStatus(current)) return true;
  if (to === "cancelled") return canStaffCancel(current) || canCancel(current);
  if (to === "refunded") return current === "refund_pending";
  return false;
}

// ---- M-Pesa (simulated STK push) ----

export type PaymentOutcome =
  "success" | "insufficient_funds" | "cancelled_by_user" | "delayed" | "timeout";

export const PAYMENT_OUTCOME_LABEL: Record<PaymentOutcome, string> = {
  success: "Payment succeeds",
  insufficient_funds: "Payment fails (insufficient funds)",
  cancelled_by_user: "Customer cancels the prompt",
  delayed: "Still processing, then confirmed by status check",
  timeout: "Payment times out",
};

/** Plain-English message for a failed STK push. */
export function paymentFailureMessage(outcome: PaymentOutcome): string {
  switch (outcome) {
    case "insufficient_funds":
      return "M-Pesa says there isn't enough balance. You have not been charged.";
    case "cancelled_by_user":
      return "The M-Pesa prompt was cancelled on your phone. You have not been charged.";
    case "timeout":
      return "The M-Pesa request expired before it was approved. You have not been charged.";
    default:
      return "Payment didn't go through. You have not been charged.";
  }
}

/** If no callback arrives within this time, the server asks M-Pesa for the result (STK query). */
export const PAYMENT_QUERY_AFTER_MS = 9000;

// ---- Ordering limits (abuse prevention) ----

/** At most this many open orders per seat per screening. Stops one QR being used to flood the kiosk. */
export const MAX_OPEN_ORDERS_PER_SEAT = 3;
/** Seat QR scans from one device: more than this many different seats in the window is blocked. */
export const SEAT_SCAN_LIMIT = 6;
export const SEAT_SCAN_WINDOW_MS = 10 * 60 * 1000;

export function isRateLimited(
  timestamps: number[],
  now: number,
  limit = SEAT_SCAN_LIMIT,
  windowMs = SEAT_SCAN_WINDOW_MS,
): boolean {
  return timestamps.filter((t) => now - t < windowMs).length >= limit;
}

export function seatOrderLimitReached(
  openOrdersForSeat: number,
  max = MAX_OPEN_ORDERS_PER_SEAT,
): boolean {
  return openOrdersForSeat >= max;
}

/** Sequential, human-readable order numbers per venue: "S-0417", "D-0012". */
export function nextOrderNumber(prefix: string, existing: string[]): string {
  const max = existing
    .filter((n) => n.startsWith(`${prefix}-`))
    .reduce((m, n) => Math.max(m, Number(n.slice(prefix.length + 1)) || 0), 400);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

/** "21:45" -> minutes since midnight, or null if not a valid 24h time. */
export function parseClock(value: string | undefined): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((value ?? "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Current minutes since midnight in Nairobi time, whatever the device timezone. */
export function nairobiMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const min = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + min;
}

/** Minutes from now until the film ends. Negative once it has ended. Handles midnight. */
export function minutesUntilEnd(nowMinutes: number, endMinutes: number): number {
  let diff = endMinutes - nowMinutes;
  if (diff < -720) diff += 1440;
  else if (diff > 720) diff -= 1440;
  return diff;
}

/** Closed when the film ends within the cutoff (inclusive) or has already ended. */
export function isOrderingClosed(
  nowMinutes: number,
  endMinutes: number,
  cutoff: number = ORDER_CUTOFF_MINUTES,
): boolean {
  return minutesUntilEnd(nowMinutes, endMinutes) <= cutoff;
}

export type WindowOverride = "auto" | "open" | "closed";

export function getOrderingWindow(
  end: string | undefined,
  now: Date,
  override: WindowOverride = "auto",
) {
  const endMinutes = parseClock(end);
  const closesAt = endMinutes === null ? null : formatClock(endMinutes - ORDER_CUTOFF_MINUTES);
  let closed = endMinutes === null ? false : isOrderingClosed(nairobiMinutes(now), endMinutes);
  if (override === "open") closed = false;
  if (override === "closed") closed = true;
  return { closed, closesAt, cutoff: ORDER_CUTOFF_MINUTES };
}

/** Digits only, +254/254 converted to a leading 0, max 10 digits. */
export function phoneDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("254")) d = "0" + d.slice(3);
  return d.slice(0, 10);
}

/** Formats as the guest types: "0712345678" -> "0712 345 678". */
export function formatPhone(input: string): string {
  const d = phoneDigits(input);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 10)].filter(Boolean).join(" ");
}

/** Kenyan mobile number: 07xx xxx xxx (also 01xx xxx xxx). */
export function isValidPhone(input: string): boolean {
  return /^0[17]\d{8}$/.test(phoneDigits(input));
}

export function timeAgo(fromMs: number, nowMs: number): string {
  const mins = Math.floor((nowMs - fromMs) / 60000);
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

// ---- Show and seat selection ----

/** A screening counts as "current" if it is on now or starts within this many minutes. */
export const SCREENING_MATCH_MINUTES = 30;

export type ScreeningTime = { start: number; end: number };

export function isCurrentScreening(
  s: ScreeningTime,
  nowMinutes: number,
  window: number = SCREENING_MATCH_MINUTES,
): boolean {
  const onNow = s.start <= nowMinutes && nowMinutes < s.end;
  const startsSoon = s.start > nowMinutes && s.start - nowMinutes <= window;
  return onNow || startsSoon;
}

export function findCurrentScreenings<T extends ScreeningTime>(list: T[], nowMinutes: number): T[] {
  return list.filter((s) => isCurrentScreening(s, nowMinutes)).sort((a, b) => a.start - b.start);
}

/**
 * One screening for a seat QR scan, never a question for the guest. In a hall with
 * back-to-back shows, the film that is on now wins while it can still take orders;
 * once it has passed the cut-off, the next show starting soon takes over.
 */
export function resolveSeatScreening<T extends ScreeningTime>(
  list: T[],
  nowMinutes: number,
  cutoff: number = ORDER_CUTOFF_MINUTES,
): T | null {
  const current = findCurrentScreenings(list, nowMinutes);
  const onNow = current.filter((s) => s.start <= nowMinutes);
  // If more than one show overlaps in the hall, the one still taking orders wins
  // (latest start first); a closed show only wins when nothing else is on or coming.
  const open = onNow.filter((s) => !isOrderingClosed(nowMinutes, s.end, cutoff)).sort((a, b) => b.start - a.start);
  const next = current.find((s) => s.start > nowMinutes);
  return open[0] ?? next ?? onNow[onNow.length - 1] ?? null;
}

export function screeningTiming(s: ScreeningTime, nowMinutes: number): string {
  if (s.start <= nowMinutes) return nowMinutes < s.end ? "On now" : "Finished";
  const mins = s.start - nowMinutes;
  return mins <= 1 ? "Starting now" : `Starts in ${mins} min`;
}

export type SeatLayout = { rows: string[]; seatsPerRow: number };

/** Default auditorium: rows A to J, seats 1 to 14. */
export const DEFAULT_SEAT_LAYOUT: SeatLayout = {
  rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
  seatsPerRow: 14,
};

/** "f7", "F 7", "F-07" -> { row: "F", number: 7, label: "F7" }. */
export function parseSeat(input: string): { row: string; number: number; label: string } | null {
  const m = /^\s*([A-Za-z])\s*-?\s*(\d{1,2})\s*$/.exec(input);
  if (!m) return null;
  const row = m[1]!.toUpperCase();
  const number = Number(m[2]);
  return { row, number, label: `${row}${number}` };
}

export function seatExists(layout: SeatLayout, input: string): boolean {
  const seat = parseSeat(input);
  if (!seat) return false;
  return layout.rows.includes(seat.row) && seat.number >= 1 && seat.number <= layout.seatsPerRow;
}

// ---- Seat QR codes ----

export const VENUE_CODE = { diamond: "DIA", sky: "SKY" } as const;
export type VenueCodeId = keyof typeof VENUE_CODE;

/** Printed on every seat sign and encoded in its QR: "SKY-2-F7". */
export function seatCode(venue: VenueCodeId, screen: number, seat: string): string {
  return `${VENUE_CODE[venue]}-${screen}-${seat.toUpperCase()}`;
}

export function parseSeatCode(
  input: string,
): { venue: VenueCodeId; screen: number; seat: string } | null {
  const m = /^\s*(DIA|SKY)\s*-?\s*(\d{1,2})\s*-?\s*([A-Za-z]\d{1,2})\s*$/i.exec(input);
  if (!m) return null;
  const venue = m[1]!.toUpperCase() === "DIA" ? "diamond" : "sky";
  const seat = parseSeat(m[3]!);
  if (!seat) return null;
  return { venue, screen: Number(m[2]), seat: seat.label };
}

// ---- Campaign attribution ----

export type EntryPoint =
  | "admission_sms"
  | "seat_qr"
  | "booking_ref"
  | "venue_qr"
  | "website"
  | "mpesa_miniapp"
  | "promo_screen"
  | "social"
  | "direct";

export const ENTRY_POINT_LABEL: Record<EntryPoint, string> = {
  admission_sms: "Admission SMS",
  seat_qr: "Seat QR",
  booking_ref: "Booking reference",
  venue_qr: "Venue QR",
  website: "Website",
  mpesa_miniapp: "M-Pesa Mini App",
  promo_screen: "Promo screen",
  social: "Social media",
  direct: "Direct",
};

export type Attribution = {
  entryPoint: EntryPoint;
  source: string;
  medium: string;
  campaign: string;
  landingPath: string;
  at: number;
};

const ENTRY_POINTS = Object.keys(ENTRY_POINT_LABEL) as EntryPoint[];

/**
 * Reads attribution from a landing URL. `explicit` is true when the URL itself is an
 * entry point (SMS link, seat QR, campaign parameters); plain navigation is not.
 */
export function attributionFromUrl(
  pathname: string,
  search: string,
  now: number,
): { attribution: Attribution; explicit: boolean } {
  const q = new URLSearchParams(search);
  const source = q.get("utm_source") ?? "";
  const medium = q.get("utm_medium") ?? "";
  const campaign = q.get("utm_campaign") ?? "";
  const declared = q.get("entry") as EntryPoint | null;
  let entryPoint: EntryPoint = "direct";
  if (pathname.startsWith("/t/")) entryPoint = "admission_sms";
  else if (pathname.startsWith("/q/")) entryPoint = "seat_qr";
  else if (declared && ENTRY_POINTS.includes(declared)) entryPoint = declared;
  else if (medium === "cinema_screen") entryPoint = "promo_screen";
  else if (medium === "social") entryPoint = "social";
  else if (source === "mpesa_miniapp") entryPoint = "mpesa_miniapp";
  else if (source) entryPoint = "website";
  const explicit = entryPoint !== "direct" || Boolean(source || campaign);
  return {
    attribution: {
      entryPoint,
      source:
        source ||
        (entryPoint === "admission_sms" ? "sms" : entryPoint === "seat_qr" ? "seat_qr" : ""),
      medium:
        medium || (entryPoint === "admission_sms" ? "sms" : entryPoint === "seat_qr" ? "qr" : ""),
      campaign: campaign || (entryPoint === "admission_sms" ? "post_admission" : ""),
      landingPath: pathname,
      at: now,
    },
    explicit,
  };
}

/** First touch wins: only a new explicit entry replaces what we already have. */
export function shouldReplaceAttribution(existing: Attribution | null, explicit: boolean): boolean {
  return !existing || explicit;
}
