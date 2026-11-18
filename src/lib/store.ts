// Shared local state (mock backend). Everything lives in localStorage so the guest
// view, the /staff kiosk and the /admissions demo see the same data, across tabs too.
// Storage events give the kiosk near real-time updates without any extra infrastructure.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { TicketChannel } from "./bookings";
import { baseItemId, START_STOCK, summarizeCart, type VenueId } from "./data";
import {
  attributionFromUrl,
  canCancel,
  canTransition,
  getOrderingWindow,
  isOpenOrder,
  nextOrderNumber,
  shouldReplaceAttribution,
  type Attribution,
  type EntryPoint,
  type OrderStatus,
  type PaymentOutcome,
  type WindowOverride,
} from "./rules";

/** How strongly the order is tied to a ticket. A seat QR proves nothing about ownership. */
export type Verification = "ticket_link" | "booking_ref" | "unverified";

/** The guest's ordering session: one screening, one seat. */
export type Session = {
  venue: VenueId;
  screeningId: string;
  film: string;
  screen: string;
  start: string;
  /** HH:MM; drives the ordering cut-off */
  end: string;
  seat: string;
  entryPoint: EntryPoint;
  verification: Verification;
  bookingRef: string | null;
  ticketRef: string | null;
  ticketChannel: TicketChannel | null;
  /** Signed link the session came from, so the guest can go back to it. */
  linkToken: string | null;
  /** Seat QR code the session came from. */
  seatCode: string | null;
  /** Known from the booking; otherwise the guest may type it at checkout. */
  customerName: string | null;
};
export type Cart = { lines: Record<string, number>; note: string; phone: string };
export type OrderLine = {
  /** Basket key: product id plus chosen options */
  itemId: string;
  name: string;
  /** Chosen options, e.g. "Large · No ice" */
  extras: string;
  image: string;
  price: number;
  qty: number;
};
export type PaymentAttempt = {
  id: string;
  phone: string;
  at: number;
  state: "pending" | "success" | "failed";
  outcome: PaymentOutcome | null;
  receipt: string | null;
  resolvedBy: "callback" | "status_query" | null;
  resolvedAt: number | null;
};
export type HistoryEntry = {
  status: OrderStatus;
  at: number;
  by: "guest" | "staff" | "mpesa" | "system";
  note?: string;
};
export type Order = {
  id: string;
  number: string;
  venue: VenueId;
  screen: string;
  film: string;
  screeningId: string;
  start: string;
  end: string;
  seat: string;
  bookingRef: string | null;
  ticketRef: string | null;
  ticketChannel: TicketChannel | null;
  customerName: string;
  verification: Verification;
  entryPoint: EntryPoint;
  attribution: Attribution | null;
  lines: OrderLine[];
  note: string;
  total: number;
  phone: string;
  status: OrderStatus;
  attempts: PaymentAttempt[];
  receipt: string | null;
  ignoredCallbacks: number;
  history: HistoryEntry[];
  createdAt: number;
  updatedAt: number;
  paidAt: number | null;
};
export type IssueType = "missing_item" | "wrong_item" | "taking_too_long" | "spilled" | "other";
export type RunnerRequest = {
  id: string;
  number: string;
  type: "runner" | "issue";
  issue: IssueType | null;
  message: string;
  venue: VenueId;
  screen: string;
  film: string;
  seat: string;
  orderId: string | null;
  orderNumber: string | null;
  status: "open" | "acknowledged" | "resolved";
  createdAt: number;
  updatedAt: number;
};
export type Admission = {
  bookingRef: string;
  admittedAt: number;
  /** Latest ordering link issued for this booking; older links stop working. */
  token: string | null;
  expiresAt: number | null;
};
export type SmsMessage = {
  id: string;
  to: string;
  body: string;
  link: string;
  at: number;
  bookingRef: string;
  status: "sending" | "sent";
  expiresAt: number;
};
export type DevSettings = {
  paymentOutcome: PaymentOutcome;
  duplicateCallback: boolean;
  windowOverride: WindowOverride;
};

function createLocalStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cacheRaw: string | null | undefined;
  let cacheVal: T = fallback;
  const mergeable = fallback !== null && typeof fallback === "object" && !Array.isArray(fallback);

  function get(): T {
    if (typeof window === "undefined") return fallback;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cacheVal;
    }
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      try {
        const parsed = raw === null ? fallback : (JSON.parse(raw) as T);
        cacheVal = mergeable && parsed ? ({ ...fallback, ...parsed } as T) : parsed;
      } catch {
        cacheVal = fallback;
      }
    }
    return cacheVal;
  }

  function set(next: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage full or blocked: ignore in prototype */
    }
    listeners.forEach((l) => l());
  }

  function update(fn: (prev: T) => T) {
    set(fn(get()));
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, get, () => fallback);
  }

  return { get, set, update, useValue };
}

const EMPTY_CART: Cart = { lines: {}, note: "", phone: "" };
const DEFAULT_DEV: DevSettings = {
  paymentOutcome: "success",
  duplicateCallback: false,
  windowOverride: "auto",
};

export const sessionStore = createLocalStore<Session | null>("anga.session.v3", null);
export const cartStore = createLocalStore<Cart>("anga.cart.v2", EMPTY_CART);
export const ordersStore = createLocalStore<Order[]>("anga.orders.v3", []);
export const runnerStore = createLocalStore<RunnerRequest[]>("anga.runner.v1", []);
export const attributionStore = createLocalStore<Attribution | null>("anga.attribution.v1", null);
export const admissionsStore = createLocalStore<Record<string, Admission>>(
  "anga.admissions.v1",
  {},
);
export const smsStore = createLocalStore<SmsMessage[]>("anga.sms.v1", []);
/** Link nonce -> device that first opened it (single use per device). */
export const linkBindingStore = createLocalStore<Record<string, string>>("anga.linkbind.v1", {});
export const seatScanStore = createLocalStore<number[]>("anga.seatscans.v1", []);
export const devStore = createLocalStore<DevSettings>("anga.dev.v2", DEFAULT_DEV);
/** Items left per menu item. Reduced when M-Pesa confirms an order. */
export const stockStore = createLocalStore<Record<string, number>>("anga.stock.v1", START_STOCK);

export const useSession = sessionStore.useValue;
export const useCart = cartStore.useValue;
export const useOrders = ordersStore.useValue;
export const useRunnerRequests = runnerStore.useValue;
export const useAdmissions = admissionsStore.useValue;
export const useSms = smsStore.useValue;
export const useDev = devStore.useValue;
export const useAttribution = attributionStore.useValue;
export const useStock = stockStore.useValue;

export function stockLeft(stock: Record<string, number>, itemId: string): number {
  const id = baseItemId(itemId);
  return stock[id] ?? START_STOCK[id] ?? 0;
}

export function takeStock(lines: OrderLine[]) {
  stockStore.update((prev) => {
    const next = { ...prev };
    for (const l of lines) {
      const id = baseItemId(l.itemId);
      next[id] = Math.max(0, stockLeft(prev, id) - l.qty);
    }
    return next;
  });
}

export function restock(itemId: string) {
  stockStore.update((prev) => ({ ...prev, [itemId]: (START_STOCK[itemId] ?? 30) + 20 }));
}

// ---- Helpers ----

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomCode(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

/**
 * This browser tab's device id. Kept in sessionStorage so a second tab behaves like a
 * second phone: handy for showing single-use links in the demo.
 */
export function getDeviceId(): string {
  try {
    let id = window.sessionStorage.getItem("anga.device");
    if (!id) {
      id = `dev-${randomCode(8)}`;
      window.sessionStorage.setItem("anga.device", id);
    }
    return id;
  } catch {
    return "dev-unknown";
  }
}

// ---- Session, cart, attribution ----

/** Saves the chosen show and seat. The cart is kept, so guests can correct either step. */
export function startSession(session: Session) {
  sessionStore.set(session);
}

/** Records first-touch attribution for this landing. Plain navigation never overwrites it. */
export function captureAttribution(pathname: string, search: string) {
  const { attribution, explicit } = attributionFromUrl(pathname, search, Date.now());
  if (shouldReplaceAttribution(attributionStore.get(), explicit)) attributionStore.set(attribution);
}

export function setQty(itemId: string, qty: number) {
  cartStore.update((c) => {
    const lines = { ...c.lines };
    if (qty <= 0) delete lines[itemId];
    else lines[itemId] = qty;
    return { ...c, lines };
  });
}

export function setNote(note: string) {
  cartStore.update((c) => ({ ...c, note }));
}

export function setPhone(phone: string) {
  cartStore.update((c) => ({ ...c, phone }));
}

export function clearCart() {
  cartStore.update((c) => ({ ...c, lines: {}, note: "" }));
}

// ---- Orders ----

const VENUE_PREFIX: Record<VenueId, string> = { diamond: "D", sky: "S" };

export function updateOrder(id: string, fn: (o: Order) => Order) {
  ordersStore.update((prev) =>
    prev.map((o) => (o.id === id ? { ...fn(o), updatedAt: Date.now() } : o)),
  );
}

function withStatus(o: Order, status: OrderStatus, by: HistoryEntry["by"], note?: string): Order {
  const entry: HistoryEntry = note
    ? { status, at: Date.now(), by, note }
    : { status, at: Date.now(), by };
  return { ...o, status, history: [...o.history, entry] };
}

/** Open orders for one seat in one screening (used for limits and kiosk flags). */
export function openOrdersForSeat(
  orders: Order[],
  screeningId: string,
  seat: string,
  exceptId?: string,
) {
  return orders.filter(
    (o) =>
      o.screeningId === screeningId &&
      o.seat === seat &&
      o.id !== exceptId &&
      isOpenOrder(o.status) &&
      o.status !== "payment_failed",
  );
}

/**
 * An unpaid order for this seat that a retry should reuse instead of creating a duplicate
 * (double taps, a second tab, coming back after a failed payment).
 */
export function findReusableOrder(session: Session): Order | undefined {
  const cutoff = Date.now() - 20 * 60_000;
  return ordersStore
    .get()
    .find(
      (o) =>
        o.screeningId === session.screeningId &&
        o.seat === session.seat &&
        (o.status === "pending_payment" || o.status === "payment_failed") &&
        o.createdAt > cutoff,
    );
}

function toOrderLines(cart: Cart): { lines: OrderLine[]; total: number } {
  const summary = summarizeCart(cart.lines);
  return {
    total: summary.total,
    lines: summary.lines.map((l) => ({
      itemId: l.key,
      name: l.item.name,
      extras: l.extras,
      image: l.item.image,
      price: l.unitPrice,
      qty: l.qty,
    })),
  };
}

export function createOrder(
  session: Session,
  cart: Cart,
  phone: string,
  customerName?: string,
): Order {
  const { lines, total } = toOrderLines(cart);
  const now = Date.now();
  const existing = ordersStore.get();
  const order: Order = {
    id: `${now.toString(36)}-${randomCode(6).toLowerCase()}`,
    number: nextOrderNumber(
      VENUE_PREFIX[session.venue],
      existing.map((o) => o.number),
    ),
    venue: session.venue,
    screen: session.screen,
    film: session.film,
    screeningId: session.screeningId,
    start: session.start,
    end: session.end,
    seat: session.seat,
    bookingRef: session.bookingRef,
    ticketRef: session.ticketRef,
    ticketChannel: session.ticketChannel,
    customerName: (customerName ?? session.customerName ?? "").trim() || "Guest",
    verification: session.verification,
    entryPoint: session.entryPoint,
    attribution: attributionStore.get(),
    lines,
    note: cart.note.trim(),
    total,
    phone,
    status: "pending_payment",
    attempts: [],
    receipt: null,
    ignoredCallbacks: 0,
    history: [{ status: "pending_payment", at: now, by: "guest" }],
    createdAt: now,
    updatedAt: now,
    paidAt: null,
  };
  ordersStore.update((prev) => [order, ...prev]);
  return order;
}

/** Refreshes an unpaid order's items before a payment retry. */
export function refreshUnpaidOrder(id: string, cart: Cart, phone: string, customerName?: string) {
  const { lines, total } = toOrderLines(cart);
  updateOrder(id, (o) => ({
    ...withStatus(o, "pending_payment", "guest", "Payment retried"),
    customerName: customerName?.trim() || o.customerName,
    lines,
    note: cart.note.trim(),
    total,
    phone,
  }));
}

export type TransitionResult = "ok" | "stale";

/**
 * Moves an order on, but only if it is still in `from`. If someone else already moved it,
 * nothing happens and the caller is told, so an order is never processed twice.
 */
export function transitionOrder(
  id: string,
  from: OrderStatus,
  to: OrderStatus,
  by: HistoryEntry["by"],
): TransitionResult {
  const order = ordersStore.get().find((o) => o.id === id);
  if (!order || !canTransition(order.status, from, to)) return "stale";
  if (to === "cancelled" && order.paidAt) {
    // A paid order that is cancelled must be refunded.
    updateOrder(id, (o) => withStatus(withStatus(o, "cancelled", by), "refund_pending", "system"));
  } else {
    updateOrder(id, (o) => withStatus(o, to, by));
  }
  return "ok";
}

export function cancelOrderByGuest(id: string): boolean {
  const order = ordersStore.get().find((o) => o.id === id);
  if (!order || !canCancel(order.status)) return false;
  return transitionOrder(id, order.status, "cancelled", "guest") === "ok";
}

export function setOrderStatusInternal(
  id: string,
  status: OrderStatus,
  by: HistoryEntry["by"],
  note?: string,
) {
  updateOrder(id, (o) => withStatus(o, status, by, note));
}

// ---- Runner and help requests ----

export function createRunnerRequest(
  input: Omit<RunnerRequest, "id" | "number" | "status" | "createdAt" | "updatedAt">,
): RunnerRequest {
  const now = Date.now();
  const existing = runnerStore.get();
  const req: RunnerRequest = {
    ...input,
    id: `r-${now.toString(36)}-${randomCode(4).toLowerCase()}`,
    number: `R-${String(existing.length + 1).padStart(3, "0")}`,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  runnerStore.update((prev) => [req, ...prev]);
  return req;
}

export function setRunnerStatus(id: string, status: RunnerRequest["status"]) {
  runnerStore.update((prev) =>
    prev.map((r) => (r.id === id ? { ...r, status, updatedAt: Date.now() } : r)),
  );
}

// ---- Admissions (simulated admissions app + SMS gateway) ----

export function recordAdmission(admission: Admission) {
  admissionsStore.update((prev) => ({ ...prev, [admission.bookingRef]: admission }));
}

export function recordSms(sms: SmsMessage) {
  smsStore.update((prev) => [sms, ...prev]);
}

export function markSmsSent(id: string) {
  smsStore.update((prev) => prev.map((m) => (m.id === id ? { ...m, status: "sent" as const } : m)));
}

/** Binds a link to the first device that opens it. Returns false for any other device. */
export function bindLinkToDevice(nonce: string): boolean {
  const device = getDeviceId();
  const bound = linkBindingStore.get()[nonce];
  if (bound && bound !== device) return false;
  if (!bound) linkBindingStore.update((prev) => ({ ...prev, [nonce]: device }));
  return true;
}

export function recordSeatScan(now: number) {
  seatScanStore.update((prev) => [...prev.filter((t) => now - t < 60 * 60_000), now]);
}

export function resetAllDemoData() {
  ordersStore.set([]);
  cartStore.set(EMPTY_CART);
  sessionStore.set(null);
  runnerStore.set([]);
  admissionsStore.set({});
  smsStore.set([]);
  linkBindingStore.set({});
  seatScanStore.set([]);
  attributionStore.set(null);
  stockStore.set(START_STOCK);
}

// ---- Hooks ----

const noopSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards. Gate localStorage-driven UI on it. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useNow(intervalMs = 15000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useOrderingWindow(end: string | undefined) {
  const now = useNow();
  const dev = useDev();
  return useMemo(
    () => getOrderingWindow(end, new Date(now), dev.windowOverride),
    [end, now, dev.windowOverride],
  );
}

export function useOrder(id: string): Order | undefined {
  const orders = useOrders();
  return orders.find((o) => o.id === id);
}

/** Latest open order for this seat and screening (to link back to tracking). */
export function useActiveOrder(session: Session | null): Order | undefined {
  const orders = useOrders();
  if (!session) return undefined;
  return orders.find(
    (o) =>
      o.screeningId === session.screeningId &&
      o.seat === session.seat &&
      isOpenOrder(o.status) &&
      o.status !== "payment_failed",
  );
}
