import { describe, expect, it } from "vitest";

import { cartKey, formatKsh, parseCartKey, SEAT_DELIVERY_FEE, summarizeCart } from "@/lib/data";
import {
  GUEST_TRACK,
  guestStepIndex,
  attributionFromUrl,
  canCancel,
  canStaffCancel,
  canTransition,
  isOpenOrder,
  isRateLimited,
  MAX_OPEN_ORDERS_PER_SEAT,
  nextOrderNumber,
  parseSeatCode,
  resolveSeatScreening,
  seatCode,
  seatOrderLimitReached,
  SEAT_SCAN_LIMIT,
  SEAT_SCAN_WINDOW_MS,
  shouldReplaceAttribution,
  DEFAULT_SEAT_LAYOUT,
  findCurrentScreenings,
  formatPhone,
  getOrderingWindow,
  isOrderingClosed,
  isValidPhone,
  nextStatus,
  ORDER_CUTOFF_MINUTES,
  parseClock,
  parseSeat,
  SCREENING_MATCH_MINUTES,
  seatExists,
} from "@/lib/rules";

const at = (hhmm: string) => parseClock(hhmm)!;

describe("ordering cutoff", () => {
  it("closes ordering 20 minutes before the film ends", () => {
    expect(ORDER_CUTOFF_MINUTES).toBe(20);
  });
  it("is closed at exactly 20 minutes before the end", () => {
    expect(isOrderingClosed(at("21:25"), at("21:45"))).toBe(true);
  });
  it("is open 21 minutes before the end", () => {
    expect(isOrderingClosed(at("21:24"), at("21:45"))).toBe(false);
  });
  it("is closed after the film has ended", () => {
    expect(isOrderingClosed(at("21:50"), at("21:45"))).toBe(true);
  });
  it("handles films ending after midnight", () => {
    expect(isOrderingClosed(at("23:50"), at("00:30"))).toBe(false);
    expect(isOrderingClosed(at("00:15"), at("00:30"))).toBe(true);
  });
  it("reports the closing time and respects dev overrides", () => {
    const w = getOrderingWindow("21:45", new Date(), "open");
    expect(w.closesAt).toBe("21:25");
    expect(w.closed).toBe(false);
    expect(getOrderingWindow("21:45", new Date(), "closed").closed).toBe(true);
  });
});

describe("order lifecycle", () => {
  it("runs Paid → Accepted → Preparing → Ready → Out for delivery → Delivered", () => {
    expect(nextStatus("paid")).toBe("accepted");
    expect(nextStatus("accepted")).toBe("preparing");
    expect(nextStatus("preparing")).toBe("ready");
    expect(nextStatus("ready")).toBe("out_for_delivery");
    expect(nextStatus("out_for_delivery")).toBe("delivered");
    expect(nextStatus("delivered")).toBeNull();
  });
  it("never moves an unpaid order into fulfilment", () => {
    expect(nextStatus("pending_payment")).toBeNull();
    expect(nextStatus("payment_failed")).toBeNull();
  });
  it("lets guests cancel only before preparing", () => {
    expect(canCancel("paid")).toBe(true);
    expect(canCancel("accepted")).toBe(true);
    expect(canCancel("preparing")).toBe(false);
    expect(canCancel("out_for_delivery")).toBe(false);
  });
  it("lets staff cancel until the runner has it", () => {
    expect(canStaffCancel("ready")).toBe(true);
    expect(canStaffCancel("out_for_delivery")).toBe(false);
  });
  it("refuses a transition when someone already moved the order (no double processing)", () => {
    expect(canTransition("accepted", "paid", "accepted")).toBe(false);
    expect(canTransition("paid", "paid", "accepted")).toBe(true);
    expect(canTransition("paid", "paid", "delivered")).toBe(false);
    expect(canTransition("refund_pending", "refund_pending", "refunded")).toBe(true);
  });
  it("treats delivered, cancelled and refunded orders as closed", () => {
    expect(isOpenOrder("delivered")).toBe(false);
    expect(isOpenOrder("refunded")).toBe(false);
    expect(isOpenOrder("preparing")).toBe(true);
  });
});

describe("order numbers and limits", () => {
  it("gives sequential numbers per venue", () => {
    expect(nextOrderNumber("S", [])).toBe("S-0401");
    expect(nextOrderNumber("S", ["S-0401", "D-0900", "S-0412"])).toBe("S-0413");
  });
  it("caps open orders per seat", () => {
    expect(seatOrderLimitReached(MAX_OPEN_ORDERS_PER_SEAT - 1)).toBe(false);
    expect(seatOrderLimitReached(MAX_OPEN_ORDERS_PER_SEAT)).toBe(true);
  });
  it("rate-limits one phone scanning many seats", () => {
    const now = 1_000_000_000;
    const recent = Array.from({ length: SEAT_SCAN_LIMIT }, (_, i) => now - i * 1000);
    expect(isRateLimited(recent, now)).toBe(true);
    expect(isRateLimited(recent.slice(1), now)).toBe(false);
    expect(
      isRateLimited(
        recent.map((t) => t - SEAT_SCAN_WINDOW_MS),
        now,
      ),
    ).toBe(false);
  });
});

describe("seat QR codes", () => {
  it("round-trips the code printed on the sign", () => {
    expect(seatCode("sky", 2, "f7")).toBe("SKY-2-F7");
    expect(parseSeatCode("SKY-2-F7")).toEqual({ venue: "sky", screen: 2, seat: "F7" });
    expect(parseSeatCode("dia 3 h12")).toEqual({ venue: "diamond", screen: 3, seat: "H12" });
    expect(parseSeatCode("XYZ-2-F7")).toBeNull();
  });
  it("picks the show on now, and the next one once ordering for it has closed", () => {
    const earlier = { start: at("19:00"), end: at("21:00") };
    const later = { start: at("21:15"), end: at("23:15") };
    expect(resolveSeatScreening([earlier, later], at("20:30"))).toBe(earlier);
    expect(resolveSeatScreening([earlier, later], at("20:50"))).toBe(later);
    expect(resolveSeatScreening([earlier], at("23:00"))).toBeNull();
  });
  it("prefers an overlapping show that is still open over one that has closed", () => {
    const closing = { start: at("19:30"), end: at("21:28") };
    const running = { start: at("20:40"), end: at("22:21") };
    expect(resolveSeatScreening([closing, running], at("21:15"))).toBe(running);
  });
});

describe("campaign attribution", () => {
  it("reads entry points from the landing URL", () => {
    expect(attributionFromUrl("/t/abc", "", 0).attribution.entryPoint).toBe("admission_sms");
    expect(attributionFromUrl("/q/SKY-2-F7", "", 0).attribution.entryPoint).toBe("seat_qr");
    const promo = attributionFromUrl(
      "/show",
      "?utm_source=promo_screen&utm_medium=cinema_screen&utm_campaign=combo",
      0,
    );
    expect(promo.attribution.entryPoint).toBe("promo_screen");
    expect(promo.attribution.campaign).toBe("combo");
    expect(promo.explicit).toBe(true);
  });
  it("keeps the first touch during normal navigation", () => {
    const first = attributionFromUrl("/q/SKY-2-F7", "", 0).attribution;
    const nav = attributionFromUrl("/menu", "", 1);
    expect(nav.explicit).toBe(false);
    expect(shouldReplaceAttribution(first, nav.explicit)).toBe(false);
    expect(shouldReplaceAttribution(null, false)).toBe(true);
  });
});

describe("M-Pesa phone number", () => {
  it("formats as 07xx xxx xxx", () => {
    expect(formatPhone("0712345678")).toBe("0712 345 678");
    expect(formatPhone("+254712345678")).toBe("0712 345 678");
  });
  it("accepts 07 and 01 numbers with 10 digits only", () => {
    expect(isValidPhone("0712 345 678")).toBe(true);
    expect(isValidPhone("0112 345 678")).toBe(true);
    expect(isValidPhone("0712 345 67")).toBe(false);
    expect(isValidPhone("0812 345 678")).toBe(false);
  });
});

describe("Kenyan shilling and the basket", () => {
  it("formats amounts as KES with thousands separators", () => {
    expect(formatKsh(350)).toBe("KES 350");
    expect(formatKsh(1250)).toBe("KES 1,250");
  });
  it("totals the basket, including option prices", () => {
    const large = cartKey("pop-salted", { size: "l" });
    expect(large).toBe("pop-salted~l");
    const s = summarizeCart({ "pop-salted": 2, "drk-aquamist": 1, [large]: 1 });
    expect(s.subtotal).toBe(2 * 300 + 170 + 450);
    expect(s.total).toBe(s.subtotal + SEAT_DELIVERY_FEE);
    expect(s.lines.find((l) => l.key === large)?.extras).toBe("Large");
  });
  it("keeps default choices on the plain product key", () => {
    expect(cartKey("drk-soda", { flavour: "cola", ice: "ice" })).toBe("drk-soda");
    expect(cartKey("drk-soda", { ice: "noice" })).toBe("drk-soda~cola.noice");
    expect(parseCartKey("nope")).toBeNull();
  });
});

describe("guest tracking steps", () => {
  it("groups internal statuses into four steps", () => {
    expect(GUEST_TRACK.map((s) => s.label)).toEqual([
      "Order received",
      "Preparing",
      "Ready for delivery",
      "Delivered",
    ]);
    expect(guestStepIndex("paid")).toBe(0);
    expect(guestStepIndex("accepted")).toBe(0);
    expect(guestStepIndex("out_for_delivery")).toBe(2);
    expect(guestStepIndex("delivered")).toBe(3);
    expect(guestStepIndex("pending_payment")).toBe(-1);
  });
});
