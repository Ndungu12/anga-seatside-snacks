// Shared local state (mock backend). Everything lives in localStorage so the
// guest view and the /staff queue see the same orders, including across tabs.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { summarizeCart, type VenueId } from "./data";
import {
  canCancel,
  getOrderingWindow,
  nextStatus,
  type OrderStatus,
  type WindowOverride,
} from "./rules";

export type Session = { venue: VenueId; screen: string; seat: string; end: string };
export type Cart = { seatKey: string; lines: Record<string, number>; note: string; phone: string };
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderLine = { itemId: string; name: string; price: number; qty: number };
export type Order = {
  id: string;
  code: string;
  venue: VenueId;
  screen: string;
  seat: string;
  end: string;
  lines: OrderLine[];
  note: string;
  total: number;
  phone: string;
  payment: PaymentStatus;
  status: OrderStatus;
  helpRequested: boolean;
  createdAt: number;
  updatedAt: number;
};
export type DevSettings = { simulateFailure: boolean; windowOverride: WindowOverride };

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

const EMPTY_CART: Cart = { seatKey: "", lines: {}, note: "", phone: "" };

export const sessionStore = createLocalStore<Session | null>("anga.session.v1", null);
export const cartStore = createLocalStore<Cart>("anga.cart.v1", EMPTY_CART);
export const ordersStore = createLocalStore<Order[]>("anga.orders.v1", []);
export const devStore = createLocalStore<DevSettings>("anga.dev.v1", {
  simulateFailure: false,
  windowOverride: "auto",
});

export const useSession = sessionStore.useValue;
export const useCart = cartStore.useValue;
export const useOrders = ordersStore.useValue;
export const useDev = devStore.useValue;

export function seatKey(s: Session): string {
  return `${s.venue}|${s.screen}|${s.seat}`;
}

// ---- Actions ----

export function startSession(session: Session) {
  sessionStore.set(session);
  const cart = cartStore.get();
  if (cart.seatKey !== seatKey(session)) {
    cartStore.set({ ...EMPTY_CART, phone: cart.phone, seatKey: seatKey(session) });
  }
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

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function createOrder(session: Session, cart: Cart, phone: string): Order {
  const { lines, total } = summarizeCart(cart.lines);
  const now = Date.now();
  const order: Order = {
    id: `${now.toString(36)}-${randomCode(6).toLowerCase()}`,
    code: randomCode(4),
    venue: session.venue,
    screen: session.screen,
    seat: session.seat,
    end: session.end,
    lines: lines.map((l) => ({ itemId: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty })),
    note: cart.note.trim(),
    total,
    phone,
    payment: "pending",
    status: "received",
    helpRequested: false,
    createdAt: now,
    updatedAt: now,
  };
  ordersStore.update((prev) => [order, ...prev]);
  return order;
}

export function updateOrder(id: string, patch: Partial<Order>) {
  ordersStore.update((prev) =>
    prev.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o)),
  );
}

export function advanceOrder(id: string) {
  const order = ordersStore.get().find((o) => o.id === id);
  if (!order || order.payment !== "paid") return;
  const next = nextStatus(order.status);
  if (next) updateOrder(id, { status: next });
}

export function cancelOrder(id: string): boolean {
  const order = ordersStore.get().find((o) => o.id === id);
  if (!order || !canCancel(order.status)) return false;
  updateOrder(id, { status: "cancelled" });
  return true;
}

export function setHelpRequested(id: string, value: boolean) {
  updateOrder(id, { helpRequested: value });
}

export function resetAllDemoData() {
  ordersStore.set([]);
  cartStore.set(EMPTY_CART);
  sessionStore.set(null);
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

/** Latest unfinished, paid order for this seat (to link back to tracking). */
export function useActiveOrder(session: Session | null): Order | undefined {
  const orders = useOrders();
  if (!session) return undefined;
  return orders.find(
    (o) =>
      o.venue === session.venue &&
      o.screen === session.screen &&
      o.seat === session.seat &&
      o.payment === "paid" &&
      o.status !== "delivered" &&
      o.status !== "cancelled",
  );
}
