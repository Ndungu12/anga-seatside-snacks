import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatKsh, VENUES, type VenueId } from "@/lib/data";
import { nextStatus, STATUS_LABEL, timeAgo, type OrderStatus } from "@/lib/rules";
import {
  advanceOrder,
  ordersStore,
  setHelpRequested,
  useHydrated,
  useNow,
  useOrders,
  type Order,
  type PaymentStatus,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Kiosk queue — Anga Seat Order staff" },
      { name: "description", content: "Live seat order queue for Anga Cinemas kiosk staff." },
      { property: "og:title", content: "Kiosk queue — Anga Seat Order staff" },
      { property: "og:description", content: "Live seat order queue for the cashier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  received: "Start preparing",
  preparing: "Send to seat",
  on_the_way: "Mark delivered",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid · M-Pesa",
  pending: "Awaiting payment",
  failed: "Payment failed",
};

function isActive(o: Order) {
  return o.payment !== "failed" && o.status !== "delivered" && o.status !== "cancelled";
}

function StaffPage() {
  const hydrated = useHydrated();
  const orders = useOrders();
  const now = useNow(20000);
  const [venue, setVenue] = useState<"all" | VenueId>("all");
  const [showDone, setShowDone] = useState(false);

  const byVenue = orders
    .filter((o) => venue === "all" || o.venue === venue)
    .sort((a, b) => b.createdAt - a.createdAt);
  const active = byVenue.filter(isActive);
  const done = byVenue.filter((o) => !isActive(o));
  const toPrepare = active.filter((o) => o.status === "received" && o.payment === "paid").length;
  const helpCount = active.filter((o) => o.helpRequested).length;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="font-display text-lg font-extrabold tracking-[0.25em] text-primary">
              ANGA <span className="tracking-normal text-muted-foreground">Kiosk</span>
            </p>
            <h1 className="text-sm text-muted-foreground">Seat order queue · updates live</h1>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Venue</span>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value as "all" | VenueId)}
              className="h-12 rounded-xl border-2 border-border bg-card px-3 text-base text-foreground"
            >
              <option value="all">All venues</option>
              <option value="diamond">{VENUES.diamond}</option>
              <option value="sky">{VENUES.sky}</option>
            </select>
          </label>
          <Button
            variant="outline"
            size="sm"
            className="h-12"
            onClick={() => {
              if (window.confirm("Clear every order from the queue?")) ordersStore.set([]);
            }}
          >
            Clear demo orders
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {hydrated ? (
          <>
            <p className="text-base" role="status" aria-live="polite">
              <span className="font-bold">{active.length}</span> active ·{" "}
              <span className="font-bold text-primary">{toPrepare}</span> new to prepare
              {helpCount > 0 ? (
                <>
                  {" "}
                  · <span className="font-bold text-primary">{helpCount}</span> asking for help
                </>
              ) : null}
            </p>

            {active.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-lg">No orders right now.</p>
                <p className="mt-1 text-base text-muted-foreground">
                  New seat orders appear here at the top.
                </p>
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} />
                ))}
              </ul>
            )}

            <div className="mt-10">
              <Button
                variant="ghost"
                aria-expanded={showDone}
                onClick={() => setShowDone((v) => !v)}
              >
                {showDone ? "Hide" : "Show"} finished and unpaid ({done.length})
              </Button>
              {showDone ? (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {done.map((o) => (
                    <OrderCard key={o.id} order={o} now={now} />
                  ))}
                </ul>
              ) : null}
            </div>
          </>
        ) : (
          <div aria-busy="true" className="h-40 rounded-2xl bg-card" />
        )}
      </main>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "accent" | "neutral" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm font-semibold",
        tone === "accent" && "border-primary bg-primary-soft text-primary",
        tone === "neutral" && "border-border text-foreground",
        tone === "danger" && "border-destructive bg-destructive-soft text-destructive",
      )}
    >
      {children}
    </span>
  );
}

function OrderCard({ order, now }: { order: Order; now: number }) {
  const next = nextStatus(order.status);
  const action = ACTION_LABEL[order.status];
  const isNew = order.status === "received" && order.payment === "paid" && now - order.createdAt < 120000;
  const finished = !isActive(order);

  return (
    <li
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-4",
        isNew ? "border-primary" : "border-border",
        finished && "opacity-70",
      )}
      aria-label={`Order ${order.code}, seat ${order.seat}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Seat</p>
          <p className="font-display text-4xl font-extrabold leading-none">{order.seat}</p>
          <p className="mt-1 text-base font-semibold">{order.film}</p>
          <p className="text-sm text-muted-foreground">
            {VENUES[order.venue]} · Screen {order.screen}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-base font-bold">#{order.code}</p>
          <p className="text-sm text-muted-foreground">{timeAgo(order.createdAt, now)}</p>
          {isNew ? <p className="mt-1 text-sm font-bold text-primary">New</p> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill tone={order.payment === "paid" ? "neutral" : order.payment === "pending" ? "accent" : "danger"}>
          {PAYMENT_LABEL[order.payment]}
        </Pill>
        <Pill tone={order.status === "cancelled" ? "danger" : "neutral"}>
          {STATUS_LABEL[order.status]}
        </Pill>
        {order.helpRequested && !finished ? (
          <Pill tone="accent">
            <CircleHelp aria-hidden className="size-4" /> Guest needs help
          </Pill>
        ) : null}
      </div>

      <ul className="mt-3 space-y-1 border-t border-border pt-3 text-base">
        {order.lines.map((l) => (
          <li key={l.itemId} className="flex justify-between gap-2">
            <span>
              <span className="font-bold">{l.qty} ×</span> {l.name}
            </span>
          </li>
        ))}
      </ul>
      {order.note ? (
        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-base">
          <span className="text-muted-foreground">Note: </span>
          {order.note}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">
        {formatKsh(order.total)} (placeholder) · {order.phone}
      </p>

      <div className="mt-auto grid gap-2 pt-4">
        {order.helpRequested && !finished ? (
          <Button variant="accent" onClick={() => setHelpRequested(order.id, false)}>
            Help sent to seat {order.seat}
          </Button>
        ) : null}
        {!finished && next && action ? (
          order.payment === "paid" ? (
            <Button
              size="lg"
              onClick={() => advanceOrder(order.id)}
              aria-label={`${action} for seat ${order.seat}, order ${order.code}`}
            >
              {action}
            </Button>
          ) : (
            <Button size="lg" variant="secondary" disabled>
              Waiting for payment
            </Button>
          )
        ) : null}
      </div>
    </li>
  );
}
