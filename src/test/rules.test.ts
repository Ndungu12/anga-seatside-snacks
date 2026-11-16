import { describe, expect, it } from "vitest";

import { formatKsh, summarizeCart } from "@/lib/data";
import {
  canCancel,
  formatPhone,
  getOrderingWindow,
  isOrderingClosed,
  isValidPhone,
  nextStatus,
  ORDER_CUTOFF_MINUTES,
  parseClock,
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

describe("order status", () => {
  it("moves Received → Preparing → On its way → Delivered", () => {
    expect(nextStatus("received")).toBe("preparing");
    expect(nextStatus("preparing")).toBe("on_the_way");
    expect(nextStatus("on_the_way")).toBe("delivered");
    expect(nextStatus("delivered")).toBeNull();
  });
  it("allows cancelling only before Preparing", () => {
    expect(canCancel("received")).toBe(true);
    expect(canCancel("preparing")).toBe(false);
    expect(canCancel("on_the_way")).toBe(false);
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

describe("Kenyan shilling", () => {
  it("formats amounts as KSh with thousands separators", () => {
    expect(formatKsh(350)).toBe("KSh 350");
    expect(formatKsh(1250)).toBe("KSh 1,250");
  });
  it("totals the cart", () => {
    expect(summarizeCart({ "pop-salt-r": 2, "drk-cola": 1 }).total).toBe(900);
  });
});
