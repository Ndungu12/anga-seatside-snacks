import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { admitTicket, validateTicket } from "@/lib/admission";
import { bookingForLink, findBooking, getBookings } from "@/lib/bookings";
import { applyStkCallback, initiateStkPush } from "@/lib/mpesa";
import { PAYMENT_QUERY_AFTER_MS, PAYMENT_WAIT_MS } from "@/lib/rules";
import {
  cartStore,
  createOrder,
  devStore,
  ordersStore,
  resetAllDemoData,
  transitionOrder,
  type Session,
} from "@/lib/store";
import {
  createLinkToken,
  linkExpiryMs,
  tamper,
  verifyLinkToken,
  type LinkPayload,
} from "@/lib/tokens";

const session: Session = {
  venue: "sky",
  screeningId: "sky.1.demo-rains.1210",
  film: "The Long Rains",
  screen: "1",
  start: "20:10",
  end: "22:02",
  seat: "F7",
  entryPoint: "seat_qr",
  verification: "unverified",
  bookingRef: null,
  ticketRef: null,
  ticketChannel: null,
  linkToken: null,
  seatCode: "SKY-1-F7",
  customerName: "Test Guest",
};

describe("signed admission links", () => {
  const payload: LinkPayload = {
    v: 1,
    b: "AGB-48213",
    s: "sky.1.demo-rains.1210",
    exp: 2_000,
    n: "abc",
  };

  it("accepts an untouched link before expiry", () => {
    const res = verifyLinkToken(createLinkToken(payload), 1_000);
    expect(res.ok && res.payload.b).toBe("AGB-48213");
  });
  it("rejects a tampered link", () => {
    expect(verifyLinkToken(tamper(createLinkToken(payload)), 1_000)).toMatchObject({
      ok: false,
      reason: "bad_signature",
    });
  });
  it("rejects a link after the screening plus grace period", () => {
    expect(verifyLinkToken(createLinkToken(payload), 2_001)).toMatchObject({
      ok: false,
      reason: "expired",
    });
  });
  it("rejects garbage", () => {
    expect(verifyLinkToken("nope", 0)).toMatchObject({ ok: false, reason: "malformed" });
  });
  it("expires at the end of the screening plus 15 minutes", () => {
    const noonUtc = Date.UTC(2026, 10, 16, 9, 0); // 12:00 Nairobi
    expect(new Date(linkExpiryMs(22 * 60, noonUtc)).toISOString()).toBe("2026-11-16T19:15:00.000Z");
  });
});

describe("door validation", () => {
  it("admits a live ticket, rejects unknown and finished ones", () => {
    resetAllDemoData();
    const now = Date.UTC(2026, 10, 16, 17, 0); // 20:00 Nairobi
    const live = findBooking("ANGA-93941518", 20 * 60)!;
    expect(live.customer).toBe("John Ndungu");
    expect(live.tickets[0]!.seat).toBe("D11");
    expect(validateTicket(live, now)).toMatchObject({ ok: true, alreadyAt: null });
    admitTicket(live);
    expect(validateTicket(live, now)).toMatchObject({ ok: true });
    expect((validateTicket(live, now) as { alreadyAt: number }).alreadyAt).toBeTypeOf("number");
    expect(validateTicket(undefined, now)).toMatchObject({ ok: false, reason: "not_found" });
    const ended = findBooking("AGB-31007", 20 * 60)!;
    expect(validateTicket(ended, now)).toMatchObject({ ok: false, reason: "ended" });
  });
});

describe("mock bookings", () => {
  it("covers website, Mini App and Kenyabuzz tickets, with one ticket per seat", () => {
    const list = getBookings(20 * 60);
    expect(new Set(list.map((b) => b.channel))).toEqual(
      new Set(["website", "mpesa_miniapp", "kenyabuzz"]),
    );
    const multi = findBooking("agb-48213", 20 * 60)!;
    expect(multi.tickets.map((t) => t.seat)).toEqual(["F7", "F8"]);
    expect(findBooking("AGB-48213-T2", 20 * 60)?.ref).toBe("AGB-48213");
  });
  it("finds the booking's screening from the link even after the clock moves on", () => {
    const b = findBooking("MP-90311", 20 * 60 + 5)!;
    expect(bookingForLink("MP-90311", b.screening.id, 20 * 60 + 45)?.screening.id).toBe(
      b.screening.id,
    );
  });
});

describe("M-Pesa callbacks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAllDemoData();
    devStore.set({ paymentOutcome: "success", duplicateCallback: false, windowOverride: "auto" });
    cartStore.set({ lines: { "pop-salted": 2 }, note: "", phone: "" });
  });
  afterEach(() => vi.useRealTimers());

  it("marks the order paid only when the callback arrives", () => {
    const order = createOrder(session, cartStore.get(), "0712 345 678");
    initiateStkPush(order.id, order.phone);
    expect(ordersStore.get()[0]!.status).toBe("pending_payment");
    vi.advanceTimersByTime(PAYMENT_WAIT_MS);
    const paid = ordersStore.get()[0]!;
    expect(paid.status).toBe("paid");
    expect(paid.receipt).toMatch(/^S[A-Z0-9]{9}$/);
  });

  it("ignores a duplicate callback instead of changing the order again", () => {
    devStore.set({ ...devStore.get(), duplicateCallback: true });
    const order = createOrder(session, cartStore.get(), "0712 345 678");
    initiateStkPush(order.id, order.phone);
    vi.advanceTimersByTime(PAYMENT_WAIT_MS + 2000);
    const o = ordersStore.get()[0]!;
    expect(ordersStore.get()).toHaveLength(1);
    expect(o.history.filter((h) => h.status === "paid")).toHaveLength(1);
    expect(o.ignoredCallbacks).toBe(1);
  });

  it("records a failure and keeps the order for a retry", () => {
    devStore.set({ ...devStore.get(), paymentOutcome: "insufficient_funds" });
    const order = createOrder(session, cartStore.get(), "0712 345 678");
    initiateStkPush(order.id, order.phone);
    vi.advanceTimersByTime(PAYMENT_WAIT_MS);
    expect(ordersStore.get()[0]!.status).toBe("payment_failed");
  });

  it("reports a timed-out payment as failed, with nothing charged", () => {
    devStore.set({ ...devStore.get(), paymentOutcome: "timeout" });
    const order = createOrder(session, cartStore.get(), "0712 345 678");
    initiateStkPush(order.id, order.phone);
    vi.advanceTimersByTime(PAYMENT_QUERY_AFTER_MS);
    const o = ordersStore.get()[0]!;
    expect(o.status).toBe("payment_failed");
    expect(o.attempts[0]!.outcome).toBe("timeout");
    expect(o.paidAt).toBeNull();
  });

  it("confirms by status query when the callback never arrives", () => {
    devStore.set({ ...devStore.get(), paymentOutcome: "delayed" });
    const order = createOrder(session, cartStore.get(), "0712 345 678");
    initiateStkPush(order.id, order.phone);
    vi.advanceTimersByTime(PAYMENT_WAIT_MS);
    expect(ordersStore.get()[0]!.status).toBe("pending_payment");
    vi.advanceTimersByTime(PAYMENT_QUERY_AFTER_MS);
    expect(ordersStore.get()[0]!.attempts[0]!.resolvedBy).toBe("status_query");
    expect(ordersStore.get()[0]!.status).toBe("paid");
  });

  it("sends a late payment for a cancelled order to refund", () => {
    const order = createOrder(session, cartStore.get(), "0712 345 678");
    const attempt = initiateStkPush(order.id, order.phone);
    transitionOrder(order.id, "pending_payment", "cancelled", "guest");
    expect(applyStkCallback(order.id, attempt, "success", "callback")).toBe("applied");
    expect(ordersStore.get()[0]!.status).toBe("refund_pending");
  });

  it("only lets one of two staff screens accept the same order", () => {
    const order = createOrder(session, cartStore.get(), "0712 345 678");
    initiateStkPush(order.id, order.phone);
    vi.advanceTimersByTime(PAYMENT_WAIT_MS);
    expect(transitionOrder(order.id, "paid", "accepted", "staff")).toBe("ok");
    expect(transitionOrder(order.id, "paid", "accepted", "staff")).toBe("stale");
  });
});
