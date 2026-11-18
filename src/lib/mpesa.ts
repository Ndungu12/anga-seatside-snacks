// Simulated M-Pesa STK push. Stands in for the server and Safaricom: the guest's browser
// only ever starts a payment and watches the order. The order becomes PAID solely through
// `applyStkCallback`, which is idempotent, just as the real callback handler must be.
import { PAYMENT_QUERY_AFTER_MS, PAYMENT_WAIT_MS, type PaymentOutcome } from "./rules";
import {
  devStore,
  ordersStore,
  randomCode,
  takeStock,
  updateOrder,
  type HistoryEntry,
  type Order,
} from "./store";

type Source = "callback" | "status_query";

function history(o: Order, status: Order["status"], note: string): HistoryEntry[] {
  return [...o.history, { status, at: Date.now(), by: "mpesa", note }];
}

/** Starts an STK push for an order and schedules the simulated provider response. */
export function initiateStkPush(orderId: string, phone: string): string {
  const attemptId = `ws_CO_${Date.now().toString().slice(-8)}${randomCode(6)}`;
  updateOrder(orderId, (o) => ({
    ...o,
    attempts: [
      ...o.attempts,
      {
        id: attemptId,
        phone,
        at: Date.now(),
        state: "pending",
        outcome: null,
        receipt: null,
        resolvedBy: null,
        resolvedAt: null,
      },
    ],
  }));

  const { paymentOutcome, duplicateCallback } = devStore.get();
  if (paymentOutcome === "delayed") {
    // The callback never arrives. The server queries M-Pesa, which reports the payment went through.
    window.setTimeout(
      () => applyStkCallback(orderId, attemptId, "success", "status_query"),
      PAYMENT_QUERY_AFTER_MS,
    );
  } else if (paymentOutcome === "timeout") {
    // No answer at all: the status check reports the request expired. Nothing was charged.
    window.setTimeout(
      () => applyStkCallback(orderId, attemptId, "timeout", "status_query"),
      PAYMENT_QUERY_AFTER_MS,
    );
  } else {
    window.setTimeout(
      () => applyStkCallback(orderId, attemptId, paymentOutcome, "callback"),
      PAYMENT_WAIT_MS,
    );
    if (duplicateCallback) {
      // Safaricom can deliver the same callback twice. The second must change nothing.
      window.setTimeout(
        () => applyStkCallback(orderId, attemptId, paymentOutcome, "callback"),
        PAYMENT_WAIT_MS + 1500,
      );
    }
  }
  return attemptId;
}

/**
 * Applies a provider result. Idempotent: only a PENDING attempt can be resolved, so
 * repeated or late callbacks are counted and ignored instead of creating duplicates.
 */
export function applyStkCallback(
  orderId: string,
  attemptId: string,
  outcome: PaymentOutcome,
  source: Source,
): "applied" | "ignored" {
  const order = ordersStore.get().find((o) => o.id === orderId);
  const attempt = order?.attempts.find((a) => a.id === attemptId);
  if (!order || !attempt) return "ignored";
  if (attempt.state !== "pending") {
    updateOrder(orderId, (o) => ({ ...o, ignoredCallbacks: o.ignoredCallbacks + 1 }));
    return "ignored";
  }

  const ok = outcome === "success";
  const receipt = ok ? `S${randomCode(9)}` : null;
  const via = source === "status_query" ? "status query" : "callback";
  updateOrder(orderId, (o) => {
    const attempts = o.attempts.map((a) =>
      a.id === attemptId
        ? {
            ...a,
            state: ok ? ("success" as const) : ("failed" as const),
            outcome,
            receipt,
            resolvedBy: source,
            resolvedAt: Date.now(),
          }
        : a,
    );
    if (!ok) {
      if (o.status !== "pending_payment") return { ...o, attempts };
      return {
        ...o,
        attempts,
        status: "payment_failed",
        history: history(o, "payment_failed", `M-Pesa ${via}: ${outcome}`),
      };
    }
    if (o.status === "cancelled") {
      // Paid after the guest gave up: keep the money traceable and refund it.
      return {
        ...o,
        attempts,
        receipt,
        paidAt: Date.now(),
        status: "refund_pending",
        history: history(o, "refund_pending", `Late payment ${receipt} via ${via}`),
      };
    }
    return {
      ...o,
      attempts,
      receipt,
      paidAt: Date.now(),
      status: "paid",
      history: history(o, "paid", `Receipt ${receipt} via ${via}`),
    };
  });
  // Stock is only taken once the money is confirmed (and not for a late payment that is refunded).
  const after = ordersStore.get().find((o) => o.id === orderId);
  if (ok && after?.status === "paid") takeStock(after.lines);
  return "applied";
}

/** Kiosk demo: an order that arrives already paid, as if a guest just completed checkout. */
export function settleImmediately(orderId: string, phone: string) {
  const attemptId = `ws_CO_${Date.now().toString().slice(-8)}${randomCode(6)}`;
  updateOrder(orderId, (o) => ({
    ...o,
    attempts: [
      ...o.attempts,
      {
        id: attemptId,
        phone,
        at: Date.now(),
        state: "pending",
        outcome: null,
        receipt: null,
        resolvedBy: null,
        resolvedAt: null,
      },
    ],
  }));
  applyStkCallback(orderId, attemptId, "success", "callback");
}
