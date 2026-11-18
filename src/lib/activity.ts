// Builds the operations event feed (notifications + activity) from the shared mock state.
// Nothing is stored separately: every event is derived, so it always matches the orders.
import { VENUES } from "./data";
import { STATUS_LABEL } from "./rules";
import type { Order, RunnerRequest, SmsMessage } from "./store";

export type EventKind = "order" | "payment" | "status" | "assist" | "sms";
export type OpsEvent = {
  id: string;
  at: number;
  kind: EventKind;
  title: string;
  detail: string;
  orderId?: string;
};

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  order: "New order",
  payment: "Payment",
  status: "Status update",
  assist: "Assistance",
  sms: "SMS",
};

export function buildEvents(
  orders: Order[],
  requests: RunnerRequest[],
  sms: SmsMessage[],
): OpsEvent[] {
  const out: OpsEvent[] = [];
  for (const o of orders) {
    const where = `Seat ${o.seat} · Screen ${o.screen} · ${VENUES[o.venue]}`;
    o.history.forEach((h, i) => {
      const base = { id: `${o.id}-${i}`, at: h.at, orderId: o.id };
      if (h.status === "paid") {
        out.push({
          ...base,
          kind: "order",
          title: `New order ${o.number}`,
          detail: `${o.customerName} · ${where}`,
        });
        out.push({
          ...base,
          id: `${base.id}-p`,
          kind: "payment",
          title: `M-Pesa payment received`,
          detail: `${o.number} · ${o.receipt ?? ""}`,
        });
      } else if (h.status === "payment_failed") {
        out.push({
          ...base,
          kind: "payment",
          title: `Payment failed for ${o.number}`,
          detail: h.note ?? where,
        });
      } else if (h.status === "refund_pending" || h.status === "refunded") {
        out.push({
          ...base,
          kind: "payment",
          title: `${STATUS_LABEL[h.status]}: ${o.number}`,
          detail: where,
        });
      } else if (h.status !== "pending_payment") {
        out.push({
          ...base,
          kind: "status",
          title: `${o.number} · ${STATUS_LABEL[h.status]}`,
          detail: `${where} · by ${h.by}`,
        });
      }
    });
  }
  for (const r of requests) {
    out.push({
      id: r.id,
      at: r.createdAt,
      kind: "assist",
      title:
        r.type === "runner"
          ? `Seat ${r.seat} asked for an usher`
          : `Problem reported at seat ${r.seat}`,
      detail: `${r.number} · Screen ${r.screen} · ${VENUES[r.venue]}${r.orderNumber ? ` · ${r.orderNumber}` : ""}`,
    });
  }
  for (const m of sms) {
    out.push({
      id: m.id,
      at: m.at,
      kind: "sms",
      title: `Ordering SMS ${m.status === "sending" ? "sending" : "sent"} to ${m.to}`,
      detail: `Booking ${m.bookingRef}`,
    });
  }
  return out.sort((a, b) => b.at - a.at);
}
