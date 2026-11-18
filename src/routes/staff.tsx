import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChefHat,
  ClipboardList,
  DoorOpen,
  Footprints,
  LayoutDashboard,
  PackageCheck,
  Plus,
  QrCode,
  Search,
  Settings,
  TriangleAlert,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AngaLogo } from "@/components/anga/Brand";
import { StatusBadge, type Tone } from "@/components/anga/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buildEvents, EVENT_KIND_LABEL, type EventKind } from "@/lib/activity";
import { TICKET_CHANNEL_LABEL } from "@/lib/bookings";
import { chime } from "@/lib/chime";
import { formatKsh, LOW_STOCK, MENU, VENUES, type VenueId } from "@/lib/data";
import {
  canStaffCancel,
  ENTRY_POINT_LABEL,
  NEXT_ACTION_LABEL,
  nextStatus,
  STATUS_LABEL,
  timeAgo,
  type OrderStatus,
} from "@/lib/rules";
import { simulateIncomingOrder } from "@/lib/simulate";
import {
  openOrdersForSeat,
  ordersStore,
  resetAllDemoData,
  restock,
  runnerStore,
  setRunnerStatus,
  stockLeft,
  transitionOrder,
  useHydrated,
  useNow,
  useOrders,
  useRunnerRequests,
  useSms,
  useStock,
  type Order,
  type RunnerRequest,
} from "@/lib/store";
import { cn } from "@/lib/utils";

type View = "overview" | "orders" | "fulfilment" | "notifications" | "settings";
const VIEWS: View[] = ["overview", "orders", "fulfilment", "notifications", "settings"];

export const Route = createFileRoute("/staff")({
  validateSearch: (search: Record<string, unknown>): { view?: View | undefined } => ({
    view: VIEWS.includes(search["view"] as View) ? (search["view"] as View) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cashier dashboard — ANGA In-Seat" },
      { name: "description", content: "Live in-seat order management for Anga Cinemas staff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

/** Orders older than this are flagged so nothing waits unnoticed. */
const SLOW_AFTER_MS = 10 * 60 * 1000;

type Column = "new" | "preparing" | "ready" | "delivered";

/** Board columns (S02). Internal statuses are grouped into the four operational stages. */
const COLUMN_OF: Partial<Record<OrderStatus, Column>> = {
  paid: "new",
  accepted: "preparing",
  preparing: "preparing",
  ready: "ready",
  out_for_delivery: "ready",
  delivered: "delivered",
};

const COLUMNS: { id: Column; title: string; empty: string }[] = [
  { id: "new", title: "New", empty: "New paid orders land here with a chime." },
  { id: "preparing", title: "Preparing", empty: "Nothing being made." },
  { id: "ready", title: "Ready", empty: "Nothing waiting for a runner." },
  { id: "delivered", title: "Delivered", empty: "Delivered orders show here." },
];

const ACTION_ICON: Partial<Record<OrderStatus, typeof ChefHat>> = {
  paid: Check,
  accepted: ChefHat,
  preparing: PackageCheck,
  ready: Footprints,
  out_for_delivery: CheckCheck,
};

const NAV: { id: View | "admissions" | "signage"; label: string; icon: typeof Bell }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "fulfilment", label: "Fulfilment", icon: UtensilsCrossed },
  { id: "admissions", label: "Admissions", icon: DoorOpen },
  { id: "signage", label: "Seat QR signs", icon: QrCode },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

const ISSUE_LABEL: Record<string, string> = {
  missing_item: "Something is missing",
  wrong_item: "Wrong item",
  taking_too_long: "Taking too long",
  spilled: "Something spilled",
  other: "Other",
};

const fmtDateTime = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);

function paymentLabel(o: Order): { text: string; tone: Tone } {
  if (o.status === "refund_pending") return { text: "Refund pending", tone: "warn" };
  if (o.status === "refunded") return { text: "Refunded", tone: "muted" };
  if (o.paidAt) return { text: "Paid · M-Pesa", tone: "done" };
  if (o.status === "payment_failed") return { text: "Payment failed", tone: "error" };
  if (o.status === "pending_payment") return { text: "Awaiting M-Pesa", tone: "warn" };
  return { text: "Not paid", tone: "muted" };
}

function RequestsPanel({ requests, now }: { requests: RunnerRequest[]; now: number }) {
  return (
    <section
      aria-label="Help and runner requests"
      className="rounded-xl bg-highlight-soft p-5 ring-1 ring-highlight"
    >
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em]">
        <BellRing aria-hidden className="size-4" /> Guests asking for help · {requests.length}
      </h2>
      <ul className="mt-3 space-y-3">
        {requests.map((r) => (
          <li key={r.id} className="rounded-lg bg-surface p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xl font-semibold">Seat {r.seat}</span>
              <span className="text-[12px] text-muted-foreground tabular">
                {r.number} · {timeAgo(r.createdAt, now)}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Screen {r.screen} · {VENUES[r.venue]}
              {r.orderNumber ? ` · ${r.orderNumber}` : ""}
            </p>
            <p className="mt-1 text-[14px] font-medium">
              {r.type === "runner"
                ? "Send someone to the seat"
                : `Issue: ${ISSUE_LABEL[r.issue ?? "other"]}`}
              {r.message ? <span className="font-normal"> · "{r.message}"</span> : null}
            </p>
            <div className="mt-2 flex gap-2">
              {r.status === "open" ? (
                <Button
                  size="sm"
                  className="h-9 flex-1"
                  onClick={() => setRunnerStatus(r.id, "acknowledged")}
                >
                  On our way
                </Button>
              ) : (
                <StatusBadge tone="active" className="h-9 flex-1 justify-center">
                  Usher sent
                </StatusBadge>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-9 flex-1"
                onClick={() => setRunnerStatus(r.id, "resolved")}
              >
                Resolved
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderDetails({
  order,
  now,
  onClose,
  onMove,
}: {
  order: Order | undefined;
  now: number;
  onClose: () => void;
  onMove: (o: Order, to: OrderStatus) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pay = order ? paymentLabel(order) : null;
  const a = order?.attribution;
  const rows: [string, string][] = order
    ? [
        ["Placed", fmtDateTime(order.createdAt)],
        ["Customer", order.customerName],
        ["Cinema", VENUES[order.venue]],
        ["Hall", `Screen ${order.screen}`],
        ["Seat", order.seat],
        ["Film", `${order.film} · ${order.start}–${order.end}`],
        [
          "Booking",
          order.bookingRef
            ? `${order.bookingRef} · ticket ${order.ticketRef}`
            : "None (not linked to a ticket)",
        ],
        [
          "Ticket bought via",
          order.ticketChannel ? TICKET_CHANNEL_LABEL[order.ticketChannel] : "Unknown",
        ],
        ["Ordered via", ENTRY_POINT_LABEL[order.entryPoint]],
        [
          "Campaign",
          a && (a.source || a.campaign)
            ? [a.source, a.medium, a.campaign].filter(Boolean).join(" / ")
            : "None",
        ],
        ["Phone", order.phone],
      ]
    : [];

  return (
    <Sheet
      open={Boolean(order)}
      onOpenChange={(v) => {
        if (!v) {
          setConfirmCancel(false);
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        className="theme-ops w-full overflow-y-auto border-border bg-surface text-foreground sm:max-w-md"
      >
        {order && pay ? (
          <>
            <SheetHeader className="px-0 text-left">
              <SheetTitle className="flex items-baseline gap-3 font-display text-2xl font-semibold">
                {order.number}
                <span className="text-[15px] font-normal text-muted-foreground">
                  Seat {order.seat}
                </span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap gap-1.5">
                <StatusBadge tone="active">{STATUS_LABEL[order.status]}</StatusBadge>
                <StatusBadge tone={pay.tone}>{pay.text}</StatusBadge>
              </SheetDescription>
            </SheetHeader>

            <dl className="mt-2 divide-y divide-border border-y border-border text-[14px]">
              {rows.map(([k, v]) => (
                <div key={k} className="flex gap-4 py-2">
                  <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="min-w-0">{v}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Items
            </h3>
            <ul className="mt-1 divide-y divide-border border-y border-border text-[15px]">
              {order.lines.map((l) => (
                <li key={l.itemId} className="flex justify-between py-2">
                  <span>
                    <b className="tabular">{l.qty}×</b> {l.name}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {formatKsh(l.qty * l.price)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between py-2 font-semibold">
                <span>Total</span>
                <span className="tabular">{formatKsh(order.total)}</span>
              </li>
            </ul>
            {order.note ? (
              <p className="mt-2 rounded-md bg-highlight-soft px-3 py-2 text-[15px]">
                <b>Note:</b> {order.note}
              </p>
            ) : null}

            <h3 className="mt-5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              M-Pesa
            </h3>
            <ul className="mt-1 space-y-1 text-[14px]">
              {order.attempts.length === 0 ? (
                <li className="text-muted-foreground">No payment attempts</li>
              ) : null}
              {order.attempts.map((t) => (
                <li key={t.id} className="flex flex-wrap justify-between gap-2">
                  <span className="font-mono text-[12px]">{t.id}</span>
                  <span>
                    {t.state === "success"
                      ? `Paid · ${t.receipt}`
                      : t.state === "failed"
                        ? `Failed · ${t.outcome}`
                        : "Pending"}
                    {t.resolvedBy === "status_query" ? " (via status query)" : ""}
                  </span>
                </li>
              ))}
              {order.ignoredCallbacks > 0 ? (
                <li className="text-muted-foreground">
                  {order.ignoredCallbacks} duplicate callback{order.ignoredCallbacks > 1 ? "s" : ""}{" "}
                  ignored
                </li>
              ) : null}
            </ul>

            <h3 className="mt-5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Timeline
            </h3>
            <ol className="mt-1 space-y-1 text-[14px]">
              {order.history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-12 shrink-0 tabular text-muted-foreground">
                    {fmtDateTime(h.at).slice(-5)}
                  </span>
                  <span>
                    {STATUS_LABEL[h.status]} <span className="text-muted-foreground">· {h.by}</span>
                    {h.note ? (
                      <span className="block text-[12px] text-muted-foreground">{h.note}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Updated {timeAgo(order.updatedAt, now).toLowerCase()}
            </p>

            <div className="mt-6 grid gap-2">
              {nextStatus(order.status) && NEXT_ACTION_LABEL[order.status] ? (
                <Button className="h-12" onClick={() => onMove(order, nextStatus(order.status)!)}>
                  {NEXT_ACTION_LABEL[order.status]}
                </Button>
              ) : null}
              {order.status === "refund_pending" ? (
                <Button className="h-12" onClick={() => onMove(order, "refunded")}>
                  Mark refunded
                </Button>
              ) : null}
              {canStaffCancel(order.status) ? (
                confirmCancel ? (
                  <div className="rounded-lg border border-destructive/40 p-3">
                    <p className="text-[14px]">
                      Cancel {order.number} and refund {formatKsh(order.total)} to {order.phone}?
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                        Keep
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          onMove(order, "cancelled");
                          setConfirmCancel(false);
                        }}
                      >
                        Cancel & refund
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="destructive-outline"
                    className="h-12"
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel order
                  </Button>
                )
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function HistoryTable({ orders, onOpen }: { orders: Order[]; onOpen: (id: string) => void }) {
  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-input px-6 py-16 text-center text-[15px] text-muted-foreground">
        No finished orders yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[900px] text-left text-[14px]">
        <thead className="border-b border-border text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
          <tr>
            {[
              "Order",
              "Placed",
              "Seat",
              "Hall",
              "Film",
              "Items",
              "Total",
              "Payment",
              "Status",
              "Channel",
            ].map((h) => (
              <th key={h} className={cn("px-3 py-2.5 font-medium", h === "Total" && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => {
            const pay = paymentLabel(o);
            return (
              <tr key={o.id} className="cursor-pointer hover:bg-muted" onClick={() => onOpen(o.id)}>
                <td className="px-3 py-2.5 font-display font-semibold">{o.number}</td>
                <td className="px-3 py-2.5 tabular text-muted-foreground">
                  {fmtDateTime(o.createdAt)}
                </td>
                <td className="px-3 py-2.5">{o.customerName}</td>
                <td className="px-3 py-2.5 font-display font-semibold">{o.seat}</td>
                <td className="px-3 py-2.5">
                  {o.screen} · {VENUES[o.venue]}
                </td>

                <td className="max-w-[220px] truncate px-3 py-2.5">
                  {o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                </td>
                <td className="px-3 py-2.5 text-right tabular">{formatKsh(o.total)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={pay.tone}>{pay.text}</StatusBadge>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={o.status === "delivered" ? "done" : "muted"}>
                    {STATUS_LABEL[o.status]}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {ENTRY_POINT_LABEL[o.entryPoint]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StaffPage() {
  const { view: viewParam } = Route.useSearch();
  const view: View = viewParam ?? "orders";
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const orders = useOrders();
  const requests = useRunnerRequests();
  const sms = useSms();
  const stock = useStock();
  const now = useNow(1000);
  const [venue, setVenue] = useState<"all" | VenueId>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [toast, setToast] = useState<Order | null>(null);
  const [seenAt, setSeenAt] = useState(() => Date.now());
  const seen = useRef<Map<string, number> | null>(null);

  // New-order alert: chime, toast and a short highlight. Orders already there on load don't ring.
  useEffect(() => {
    if (!hydrated) return;
    const paid = orders.filter((o) => o.status === "paid");
    if (!seen.current) {
      seen.current = new Map(paid.map((o) => [o.id, 0]));
      return;
    }
    const fresh = paid.filter((o) => !seen.current!.has(o.id));
    if (!fresh.length) return;
    fresh.forEach((o) => seen.current!.set(o.id, Date.now()));
    if (sound) chime();
    setToast(fresh[0]!);
  }, [orders, hydrated, sound]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);

  function move(o: Order, to: OrderStatus) {
    if (transitionOrder(o.id, o.status, to, "staff") === "stale") {
      const latest = ordersStore.get().find((x) => x.id === o.id);
      setNotice(
        `Order ${o.number} was already updated${latest ? ` to ${STATUS_LABEL[latest.status]}` : ""} on another screen. Nothing was changed.`,
      );
    }
  }

  const q = query.trim().toLowerCase();
  const inVenue = useMemo(
    () => orders.filter((o) => venue === "all" || o.venue === venue),
    [orders, venue],
  );
  const mine = inVenue.filter(
    (o) =>
      !q ||
      o.number.toLowerCase().includes(q) ||
      o.seat.toLowerCase() === q ||
      o.customerName.toLowerCase().includes(q) ||
      (o.bookingRef ?? "").toLowerCase().includes(q) ||
      (o.ticketRef ?? "").toLowerCase().includes(q) ||
      o.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
  );
  const byColumn = (c: Column) =>
    mine
      .filter((o) => COLUMN_OF[o.status] === c)
      .sort((a, b) => (c === "delivered" ? b.updatedAt - a.updatedAt : a.createdAt - b.createdAt));
  const payment = mine.filter(
    (o) => o.status === "pending_payment" || o.status === "payment_failed",
  );
  const refunds = mine.filter((o) => o.status === "refund_pending");
  const paidOrders = inVenue.filter((o) => o.paidAt);
  const revenue = paidOrders
    .filter((o) => o.status !== "refunded" && o.status !== "refund_pending")
    .reduce((n, o) => n + o.total, 0);
  const counts = {
    new: inVenue.filter((o) => COLUMN_OF[o.status] === "new").length,
    preparing: inVenue.filter((o) => COLUMN_OF[o.status] === "preparing").length,
    ready: inVenue.filter((o) => COLUMN_OF[o.status] === "ready").length,
    delivered: inVenue.filter((o) => o.status === "delivered").length,
  };
  const liveRequests = requests.filter(
    (r) => r.status !== "resolved" && (venue === "all" || r.venue === venue),
  );
  const events = useMemo(() => buildEvents(inVenue, requests, sms), [inVenue, requests, sms]);
  const unread = events.filter((e) => e.at > seenAt).length;
  const selected = selectedId ? orders.find((o) => o.id === selectedId) : undefined;
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  function go(v: View) {
    navigate({ to: "/staff", search: { view: v }, replace: true });
    if (v === "notifications") setSeenAt(Date.now());
  }

  const simulate = () => {
    if (!simulateIncomingOrder(venue))
      setNotice("No screening is on right now to simulate an order for.");
  };

  return (
    <div className="theme-ops flex min-h-dvh bg-background text-foreground">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <AngaLogo size={30} />
          <span className="leading-none">
            <span className="block font-display text-[15px] font-extrabold tracking-[0.16em]">
              ANGA
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-highlight">
              Cashier · In-Seat
            </span>
          </span>
        </div>
        <nav aria-label="Dashboard" className="mt-8 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = n.id === view;
            const badge =
              n.id === "orders"
                ? counts.new
                : n.id === "notifications"
                  ? unread
                  : n.id === "fulfilment"
                    ? counts.preparing
                    : 0;
            const cls = cn(
              "flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors duration-150",
              active
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            );
            const inner = (
              <>
                <Icon aria-hidden className="size-[18px]" />
                <span className="flex-1 text-left">{n.label}</span>
                {badge > 0 ? (
                  <span
                    className={cn(
                      "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular",
                      active ? "bg-white/20" : "bg-highlight text-highlight-foreground",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </>
            );
            if (n.id === "admissions")
              return (
                <Link key={n.id} to="/admissions" className={cls}>
                  {inner}
                </Link>
              );
            if (n.id === "signage")
              return (
                <Link key={n.id} to="/signage" className={cls}>
                  {inner}
                </Link>
              );
            return (
              <button
                key={n.id}
                type="button"
                className={cls}
                aria-current={active ? "page" : undefined}
                onClick={() => go(n.id as View)}
              >
                {inner}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-border bg-surface p-3 text-[12px] text-muted-foreground">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <span className="size-2 rounded-full bg-success" /> Live ·{" "}
            <span className="tabular">{hydrated ? clock : "--:--:--"}</span>
          </p>
          <p className="mt-1">Orders sync instantly across screens. Demo data only.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="mr-auto flex items-center gap-3">
              <span className="lg:hidden">
                <AngaLogo size={26} />
              </span>
              <div>
                <h1 className="font-display text-[20px] font-extrabold capitalize">{view}</h1>
                <p className="text-[12px] text-muted-foreground">
                  {venue === "all" ? "All venues" : VENUES[venue]} · In-seat orders
                </p>
              </div>
            </div>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Order, seat, customer, booking, phone"
                aria-label="Search orders"
                className="h-11 w-72 rounded-[10px] border border-border bg-surface pl-9 pr-3 text-[14px] placeholder:text-subtle focus:border-link focus:outline-none"
              />
            </div>
            <select
              aria-label="Cinema"
              value={venue}
              onChange={(e) => setVenue(e.target.value as "all" | VenueId)}
              className="h-11 rounded-[10px] border border-border bg-surface px-3 text-[14px]"
            >
              <option value="all">All venues</option>
              <option value="diamond">{VENUES.diamond}</option>
              <option value="sky">{VENUES.sky}</option>
            </select>
            <Button
              variant="secondary"
              className="h-11"
              aria-pressed={sound}
              onClick={() => {
                setSound((v) => !v);
                if (!sound) chime();
              }}
            >
              {sound ? <Volume2 /> : <VolumeX />}{" "}
              <span className="hidden xl:inline">Sound {sound ? "on" : "off"}</span>
            </Button>
            <button
              type="button"
              aria-label={`Notifications, ${unread} new`}
              onClick={() => go("notifications")}
              className="relative grid size-11 place-items-center rounded-[10px] border border-border bg-surface hover:bg-surface-2"
            >
              <Bell className="size-[18px]" />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[11px] font-bold text-highlight-foreground tabular">
                  {unread}
                </span>
              ) : null}
            </button>
            <Button className="h-11" onClick={simulate}>
              <Plus /> Simulate order
            </Button>
          </div>
          <nav
            aria-label="Dashboard (compact)"
            className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden"
          >
            {(["overview", "orders", "fulfilment", "notifications", "settings"] as View[]).map(
              (v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => go(v)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold capitalize",
                    v === view ? "bg-primary text-white" : "bg-surface text-muted-foreground",
                  )}
                >
                  {v}
                </button>
              ),
            )}
            <Link
              to="/admissions"
              className="flex h-9 shrink-0 items-center rounded-full bg-surface px-3 text-[13px] font-semibold text-muted-foreground"
            >
              Admissions
            </Link>
          </nav>
        </header>

        <main className="flex-1 px-5 py-5">
          {notice ? (
            <p
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive-soft px-4 py-3 text-[14px]"
            >
              <TriangleAlert aria-hidden className="size-4 text-destructive" /> {notice}
            </p>
          ) : null}

          {!hydrated ? (
            <div aria-busy="true" className="h-60 animate-pulse rounded-2xl bg-surface" />
          ) : view === "overview" ? (
            <Overview
              counts={counts}
              total={paidOrders.length}
              revenue={revenue}
              recent={[...mine]
                .filter((o) => o.paidAt)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 6)}
              events={events.slice(0, 9)}
              requests={liveRequests}
              stock={stock}
              now={now}
              onOpen={setSelectedId}
              onGo={go}
            />
          ) : view === "orders" ? (
            <>
              {liveRequests.length ? <RequestsPanel requests={liveRequests} now={now} /> : null}
              <section
                aria-label="Order board"
                className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4"
              >
                {COLUMNS.map((col) => {
                  const list = byColumn(col.id);
                  return (
                    <div
                      key={col.id}
                      className="flex min-h-[300px] flex-col rounded-2xl border border-border bg-surface/60 p-3"
                    >
                      <h2 className="mb-3 flex items-center justify-between px-1 text-[13px] font-bold uppercase tracking-[0.12em]">
                        {col.title}
                        <span
                          className={cn(
                            "grid min-w-7 place-items-center rounded-full px-2 py-0.5 text-[12px] tabular",
                            col.id === "new" && list.length
                              ? "bg-highlight text-highlight-foreground"
                              : "bg-elevated",
                          )}
                        >
                          {list.length}
                        </span>
                      </h2>
                      {list.length === 0 ? (
                        <p className="m-auto max-w-48 py-8 text-center text-[13px] text-subtle">
                          {col.empty}
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {(col.id === "delivered" ? list.slice(0, 8) : list).map((o) => (
                            <OrderCard
                              key={o.id}
                              order={o}
                              now={now}
                              flash={now - (seen.current?.get(o.id) ?? 0) < 6000}
                              seatOrders={openOrdersForSeat(orders, o.screeningId, o.seat).length}
                              onMove={move}
                              onOpen={() => setSelectedId(o.id)}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </section>
              {payment.length || refunds.length ? (
                <section className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div>
                    <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Awaiting or failed payment · {payment.length}
                    </h2>
                    <HistoryTable orders={payment} onOpen={setSelectedId} />
                  </div>
                  <div>
                    <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Refunds to process · {refunds.length}
                    </h2>
                    <HistoryTable orders={refunds} onOpen={setSelectedId} />
                  </div>
                </section>
              ) : null}
            </>
          ) : view === "fulfilment" ? (
            <Fulfilment
              orders={mine.filter(
                (o) => o.status === "accepted" || o.status === "preparing" || o.status === "paid",
              )}
              now={now}
              onMove={move}
            />
          ) : view === "notifications" ? (
            <Notifications events={events} seenAt={seenAt} onOpen={setSelectedId} />
          ) : (
            <SettingsView
              sound={sound}
              onSound={setSound}
              venue={venue}
              onVenue={setVenue}
              history={mine.filter((o) =>
                ["delivered", "cancelled", "refunded"].includes(o.status),
              )}
              onOpen={setSelectedId}
            />
          )}
        </main>
      </div>

      {toast ? (
        <div
          key={toast.id}
          role="alert"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-highlight px-5 py-4 text-highlight-foreground shadow-2xl"
        >
          <BellRing aria-hidden className="size-5 shrink-0" />
          <div>
            <p className="font-bold">New in-seat order {toast.number}</p>
            <p className="text-sm">
              {toast.customerName} · Screen {toast.screen}, seat {toast.seat}
            </p>
          </div>
        </div>
      ) : null}

      <OrderDetails order={selected} now={now} onClose={() => setSelectedId(null)} onMove={move} />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: "highlight" | "link" | "success" | undefined;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-[28px] font-extrabold leading-none tabular",
          tone === "highlight" && "text-highlight",
          tone === "link" && "text-link",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-[12px] text-subtle">{sub}</p> : null}
    </div>
  );
}

function Overview({
  counts,
  total,
  revenue,
  recent,
  events,
  requests,
  stock,
  now,
  onOpen,
  onGo,
}: {
  counts: Record<"new" | "preparing" | "ready" | "delivered", number>;
  total: number;
  revenue: number;
  recent: Order[];
  events: ReturnType<typeof buildEvents>;
  requests: RunnerRequest[];
  stock: Record<string, number>;
  now: number;
  onOpen: (id: string) => void;
  onGo: (v: View) => void;
}) {
  return (
    <div className="space-y-5">
      <section
        aria-label="Metrics"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      >
        <Metric
          label="New"
          value={counts.new}
          tone={counts.new ? "highlight" : undefined}
          sub="Waiting to accept"
        />
        <Metric label="Preparing" value={counts.preparing} />
        <Metric label="Ready" value={counts.ready} sub="With runners or waiting" />
        <Metric label="Delivered" value={counts.delivered} tone="success" />
        <Metric label="Total orders" value={total} sub="Paid this session" />
        <Metric label="Revenue" value={formatKsh(revenue)} tone="link" sub="M-Pesa, simulated" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section
          aria-label="Recent orders"
          className="rounded-2xl border border-border bg-surface p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[16px] font-bold">Recent orders</h2>
            <button
              type="button"
              onClick={() => onGo("orders")}
              className="text-[13px] font-semibold text-link"
            >
              Open board
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-subtle">
              No orders yet. Use "Simulate order" or place one from a phone.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(o.id)}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-elevated font-display text-[14px] font-extrabold">
                      {o.seat}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">
                        {o.number} · {o.customerName}
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        Screen {o.screen} · {VENUES[o.venue]} ·{" "}
                        {o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                      </span>
                    </span>
                    <span className="text-right">
                      <StatusBadge
                        tone={
                          o.status === "paid"
                            ? "new"
                            : o.status === "delivered"
                              ? "success"
                              : "active"
                        }
                      >
                        {STATUS_LABEL[o.status]}
                      </StatusBadge>
                      <span className="mt-0.5 block text-[12px] text-subtle tabular">
                        {timeAgo(o.createdAt, now)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Activity" className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[16px] font-bold">Activity</h2>
            <button
              type="button"
              onClick={() => onGo("notifications")}
              className="text-[13px] font-semibold text-link"
            >
              All notifications
            </button>
          </div>
          <EventList events={events} now={now} onOpen={onOpen} />
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {requests.length ? <RequestsPanel requests={requests} now={now} /> : null}
        <StockPanel stock={stock} />
      </div>
    </div>
  );
}

const KIND_TONE: Record<EventKind, Tone> = {
  order: "new",
  payment: "success",
  status: "active",
  assist: "warn",
  sms: "muted",
};

function EventList({
  events,
  now,
  onOpen,
  seenAt,
}: {
  events: ReturnType<typeof buildEvents>;
  now: number;
  onOpen: (id: string) => void;
  seenAt?: number;
}) {
  if (!events.length)
    return <p className="py-10 text-center text-[14px] text-subtle">Nothing has happened yet.</p>;
  return (
    <ul className="space-y-1">
      {events.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            disabled={!e.orderId}
            onClick={() => e.orderId && onOpen(e.orderId)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left enabled:hover:bg-surface-2",
              seenAt !== undefined && e.at > seenAt && "bg-highlight-soft",
            )}
          >
            <StatusBadge tone={KIND_TONE[e.kind]} className="mt-0.5 shrink-0">
              {EVENT_KIND_LABEL[e.kind]}
            </StatusBadge>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{e.title}</span>
              <span className="block truncate text-[12px] text-muted-foreground">{e.detail}</span>
            </span>
            <span className="shrink-0 text-[12px] text-subtle tabular">{timeAgo(e.at, now)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Notifications({
  events,
  seenAt,
  onOpen,
}: {
  events: ReturnType<typeof buildEvents>;
  seenAt: number;
  onOpen: (id: string) => void;
}) {
  const now = useNow(10000);
  const [kind, setKind] = useState<"all" | EventKind>("all");
  const list = kind === "all" ? events : events.filter((e) => e.kind === kind);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div role="tablist" aria-label="Filter notifications" className="mb-3 flex flex-wrap gap-2">
        {(["all", "order", "payment", "status", "assist", "sms"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "h-9 rounded-full px-3 text-[13px] font-semibold",
              kind === k
                ? "bg-highlight text-highlight-foreground"
                : "bg-surface-2 text-muted-foreground",
            )}
          >
            {k === "all" ? "All" : EVENT_KIND_LABEL[k]} ·{" "}
            {k === "all" ? events.length : events.filter((e) => e.kind === k).length}
          </button>
        ))}
      </div>
      <EventList events={list.slice(0, 80)} now={now} onOpen={onOpen} seenAt={seenAt} />
    </section>
  );
}

function Fulfilment({
  orders,
  now,
  onMove,
}: {
  orders: Order[];
  now: number;
  onMove: (o: Order, to: OrderStatus) => void;
}) {
  const list = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  if (!list.length)
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-20 text-center">
        <UtensilsCrossed aria-hidden className="mx-auto size-10 text-subtle" />
        <p className="mt-3 font-display text-lg font-bold">Kitchen is clear</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Accepted orders appear here for preparation.
        </p>
      </div>
    );
  return (
    <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {list.map((o) => {
        const slow = now - o.createdAt > SLOW_AFTER_MS;
        const next = nextStatus(o.status);
        return (
          <li
            key={o.id}
            className={cn(
              "flex flex-col rounded-2xl border bg-surface p-5",
              o.status === "preparing" ? "border-link/60" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Screen {o.screen} · {VENUES[o.venue]}
                </p>
                <p className="font-display text-[44px] font-extrabold leading-none">{o.seat}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-[20px] font-extrabold">{o.number}</p>
                <p
                  className={cn(
                    "text-[14px] font-semibold tabular",
                    slow ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {timeAgo(o.createdAt, now)}
                </p>
                <StatusBadge
                  tone={o.status === "preparing" ? "active" : o.status === "paid" ? "new" : "muted"}
                  className="mt-1"
                >
                  {o.status === "paid" ? "New" : STATUS_LABEL[o.status]}
                </StatusBadge>
              </div>
            </div>
            <ul className="mt-4 space-y-2 border-t border-border pt-4">
              {o.lines.map((l) => (
                <li key={l.itemId} className="flex items-baseline gap-3 text-[18px]">
                  <span className="w-10 shrink-0 font-display font-extrabold text-highlight tabular">
                    {l.qty}×
                  </span>
                  <span>
                    {l.name}
                    {l.extras ? (
                      <span className="block text-[14px] text-link">{l.extras}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            {o.note ? (
              <p className="mt-3 rounded-xl bg-highlight-soft px-3 py-2 text-[15px]">
                <b>Instructions:</b> {o.note}
              </p>
            ) : null}
            <div className="mt-auto pt-4">
              {next && o.status !== "paid" ? (
                <Button
                  size="lg"
                  className="h-14 w-full text-[16px]"
                  onClick={() => onMove(o, next)}
                >
                  {o.status === "accepted" ? (
                    <>
                      <ChefHat /> Mark preparing
                    </>
                  ) : (
                    <>
                      <PackageCheck /> Mark ready
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="highlight"
                  className="h-14 w-full text-[16px]"
                  onClick={() => onMove(o, "accepted")}
                >
                  <Check /> Accept order
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StockPanel({ stock }: { stock: Record<string, number> }) {
  const sorted = [...MENU].sort((a, b) => stockLeft(stock, a.id) - stockLeft(stock, b.id));
  return (
    <section aria-label="Stock" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-display text-[16px] font-bold">Stock</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sorted.slice(0, 8).map((m) => {
          const left = stockLeft(stock, m.id);
          const low = left <= LOW_STOCK;
          return (
            <li
              key={m.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2",
                left === 0 ? "bg-destructive-soft" : low ? "bg-warning-soft" : "bg-surface-2",
              )}
            >
              <img src={m.image} alt="" className="size-9 rounded-lg object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{m.name}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-[12px]",
                    low ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {low ? <TriangleAlert aria-hidden className="size-3" /> : null}
                  {left === 0 ? "Sold out" : low ? `Low · ${left} left` : `${left} left`}
                </span>
              </span>
              {low ? (
                <Button size="sm" variant="secondary" className="h-9" onClick={() => restock(m.id)}>
                  Restock
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SettingsView({
  sound,
  onSound,
  venue,
  onVenue,
  history,
  onOpen,
}: {
  sound: boolean;
  onSound: (v: boolean) => void;
  venue: "all" | VenueId;
  onVenue: (v: "all" | VenueId) => void;
  history: Order[];
  onOpen: (id: string) => void;
}) {
  const stock = useStock();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-3">
        <div>
          <p className="font-semibold">New-order sound</p>
          <p className="text-[13px] text-muted-foreground">Chime when a paid order arrives.</p>
          <Button variant="secondary" className="mt-3" onClick={() => onSound(!sound)}>
            {sound ? <Volume2 /> : <VolumeX />} {sound ? "On" : "Off"}
          </Button>
        </div>
        <div>
          <p className="font-semibold">Counter location</p>
          <p className="text-[13px] text-muted-foreground">Which cinema this screen serves.</p>
          <select
            aria-label="Counter location"
            value={venue}
            onChange={(e) => onVenue(e.target.value as "all" | VenueId)}
            className="mt-3 h-11 rounded-[10px] border border-border bg-surface-2 px-3"
          >
            <option value="all">All venues</option>
            <option value="diamond">{VENUES.diamond}</option>
            <option value="sky">{VENUES.sky}</option>
          </select>
        </div>
        <div>
          <p className="font-semibold">Demo data</p>
          <p className="text-[13px] text-muted-foreground">
            Restore the original demonstration state.
          </p>
          {confirm ? (
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Keep
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  resetAllDemoData();
                  setConfirm(false);
                }}
              >
                Reset everything
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button variant="destructive-outline" onClick={() => setConfirm(true)}>
                Reset demo data
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  ordersStore.set([]);
                  runnerStore.set([]);
                }}
              >
                Clear orders
              </Button>
            </div>
          )}
        </div>
      </section>
      <StockPanel stock={stock} />
      <section>
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Order history · {history.length}
        </h2>
        <HistoryTable orders={history} onOpen={onOpen} />
      </section>
    </div>
  );
}

function OrderCard({
  order,
  now,
  flash,
  seatOrders,
  onMove,
  onOpen,
}: {
  order: Order;
  now: number;
  flash: boolean;
  seatOrders: number;
  onMove: (o: Order, to: OrderStatus) => void;
  onOpen: () => void;
}) {
  const next = nextStatus(order.status);
  const action = NEXT_ACTION_LABEL[order.status];
  const Icon = ACTION_ICON[order.status] ?? Check;
  const isNew = order.status === "paid";
  const delivered = order.status === "delivered";
  const slow = now - order.createdAt > SLOW_AFTER_MS && !delivered;
  const pay = paymentLabel(order);

  return (
    <li
      className={cn(
        "rounded-2xl border bg-surface p-3.5 transition-shadow duration-200",
        isNew ? "border-highlight" : "border-border",
        flash && "animate-kiosk-flash",
        delivered && "opacity-70",
      )}
      aria-label={`Order ${order.number}, seat ${order.seat}, screen ${order.screen}`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Screen {order.screen} · {order.venue === "sky" ? "Sky" : "Diamond"}
            </p>
            <p className="font-display text-[28px] font-extrabold leading-tight">
              Seat {order.seat}
            </p>
            <p className="truncate text-[13px] text-muted-foreground">{order.customerName}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[15px] font-extrabold tracking-wide">{order.number}</p>
            <p
              className={cn(
                "text-[12px] tabular",
                slow ? "font-bold text-destructive" : "text-muted-foreground",
              )}
            >
              {timeAgo(order.createdAt, now)}
            </p>
            {isNew ? (
              <span className="mt-1 inline-block rounded bg-highlight px-1.5 text-[10px] font-extrabold text-highlight-foreground">
                NEW
              </span>
            ) : null}
          </div>
        </div>
        <ul className="mt-2.5 space-y-1 border-t border-border pt-2.5 text-[14px]">
          {order.lines.map((l) => (
            <li key={l.itemId} className="flex justify-between gap-2">
              <span className="min-w-0">
                <b className="tabular">{l.qty}×</b> {l.name}
                {l.extras ? <span className="text-link"> · {l.extras}</span> : null}
              </span>
            </li>
          ))}
        </ul>
        {order.note ? (
          <p className="mt-2 rounded-lg bg-highlight-soft px-2.5 py-1.5 text-[13px]">
            <b>Note:</b> {order.note}
          </p>
        ) : null}
      </button>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={pay.tone}>{pay.text}</StatusBadge>
        {!isNew && !delivered ? (
          <StatusBadge tone="active">{STATUS_LABEL[order.status]}</StatusBadge>
        ) : null}
        {order.verification !== "unverified" ? (
          <StatusBadge tone="muted">Ticket ✓</StatusBadge>
        ) : null}
        {seatOrders > 1 && !delivered ? (
          <StatusBadge tone="warn">{seatOrders} for seat</StatusBadge>
        ) : null}
        <span className="ml-auto font-display text-[15px] font-extrabold tabular">
          {formatKsh(order.total)}
        </span>
      </div>
      {next && action ? (
        <Button
          className={cn(
            "mt-3 h-12 w-full text-[14px]",
            isNew && "bg-highlight text-highlight-foreground hover:bg-[#ffe23d]",
          )}
          onClick={() => onMove(order, next)}
          aria-label={`${action}: order ${order.number}, seat ${order.seat}`}
        >
          <Icon aria-hidden /> {action}
        </Button>
      ) : null}
    </li>
  );
}
