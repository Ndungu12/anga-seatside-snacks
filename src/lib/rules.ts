// Business rules for Anga Seat Order. Pure functions, covered by src/test/rules.test.ts.

/** Ordering closes this many minutes before the film ends. Change it here only. */
export const ORDER_CUTOFF_MINUTES = 20;

/** Most of one item a guest can add. */
export const MAX_QTY_PER_ITEM = 10;

/** How long the simulated M-Pesa prompt takes before it resolves. */
export const PAYMENT_WAIT_MS = 4000;

export const STATUS_FLOW = ["received", "preparing", "on_the_way", "delivered"] as const;
export type ActiveStatus = (typeof STATUS_FLOW)[number];
export type OrderStatus = ActiveStatus | "cancelled";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  on_the_way: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function nextStatus(status: OrderStatus): ActiveStatus | null {
  if (status === "cancelled") return null;
  const i = STATUS_FLOW.indexOf(status);
  return STATUS_FLOW[i + 1] ?? null;
}

/** Guests can cancel only before the kiosk starts preparing. */
export function canCancel(status: OrderStatus): boolean {
  return status === "received";
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
