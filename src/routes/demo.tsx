import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronRight,
  Columns2,
  DoorOpen,
  FastForward,
  MonitorSmartphone,
  Plus,
  QrCode,
  RotateCcw,
  Send,
  Smartphone,
  Store,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { AngaLogo } from "@/components/anga/Brand";
import { StatusBadge } from "@/components/anga/StatusBadge";
import { Button } from "@/components/ui/button";
import { admitTicket, sendOrderingSms, validateTicket } from "@/lib/admission";
import { findBooking, getBookings } from "@/lib/bookings";
import { VENUES, type VenueId } from "@/lib/data";
import {
  DEFAULT_SEAT_LAYOUT,
  isOpenOrder,
  nairobiMinutes,
  nextStatus,
  PAYMENT_OUTCOME_LABEL,
  seatCode,
  STATUS_LABEL,
  type PaymentOutcome,
  type WindowOverride,
} from "@/lib/rules";
import { VENUE_SCREENS } from "@/lib/schedule";
import { simulateIncomingOrder } from "@/lib/simulate";
import {
  devStore,
  resetAllDemoData,
  transitionOrder,
  useAdmissions,
  useDev,
  useHydrated,
  useNow,
  useOrders,
  useRunnerRequests,
  useSms,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "ANGA In-Seat — product demo" },
      {
        name: "description",
        content: "Walk through every guest journey next to the live cashier dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoPage,
});

type View = "guest" | "split" | "kiosk" | "door" | "signage";

type Journey = { id: string; tag: string; title: string; steps: string; src: string };
const JOURNEYS: Journey[] = [
  {
    id: "sms",
    tag: "Flow 1",
    title: "Admission SMS",
    steps:
      "Ticket scanned at the door → signed SMS link → booking filled in → menu → M-Pesa → tracking",
    src: "/sms",
  },
  {
    id: "qr",
    tag: "Flow 2A",
    title: "Seat QR",
    steps: "Scan the seat → current screening found automatically → straight to the menu",
    src: "/scan?seat=SKY-2-F7",
  },
  {
    id: "generic",
    tag: "Flow 2B",
    title: "Cinema & seat selection",
    steps: "Website or venue QR → cinema → what's on now → seat → menu",
    src: "/show",
  },
  {
    id: "ref",
    tag: "Flow 2B",
    title: "Booking reference",
    steps: "Reference + phone digits → e-ticket retrieved → seat → menu",
    src: "/booking",
  },
  {
    id: "promo",
    tag: "Campaign",
    title: "Cinema-screen promotion",
    steps: "Pre-show screen link → campaign page → order; attribution travels with the order",
    src: "/promo?c=combo_week&utm_source=promo_screen&utm_medium=cinema_screen&utm_campaign=combo_week",
  },
  {
    id: "insta",
    tag: "Campaign",
    title: "Instagram promotion",
    steps: "Social post → campaign page → Anga Sky menu",
    src: "/promo?c=popcorn_friday&utm_source=instagram&utm_medium=social&utm_campaign=popcorn_friday",
  },
  {
    id: "miniapp",
    tag: "Mini App",
    title: "M-Pesa Mini App",
    steps: "Inside the Mini App (simulated) → known ticket → order with the account's number",
    src: "/miniapp",
  },
  {
    id: "home",
    tag: "Start",
    title: "Landing page",
    steps: "The full welcome experience",
    src: "/",
  },
];

/** Presentation environment: guest phone, cashier dashboard and demo controls. */
function DemoPage() {
  const hydrated = useHydrated();
  const orders = useOrders();
  const requests = useRunnerRequests();
  const [view, setView] = useState<View>("split");
  const [journey, setJourney] = useState<Journey>(JOURNEYS[0]!);
  const [phoneSrc, setPhoneSrc] = useState(JOURNEYS[0]!.src);
  const [frameKey, setFrameKey] = useState(0);

  const newOrders = hydrated ? orders.filter((o) => o.status === "paid").length : 0;
  const help = hydrated ? requests.filter((r) => r.status === "open").length : 0;

  function start(j: Journey, src = j.src) {
    setJourney(j);
    setPhoneSrc(src);
    if (view === "kiosk" || view === "door" || view === "signage") setView("split");
    setFrameKey((k) => k + 1);
  }

  const tabs: { id: View; label: string; icon: typeof Store; badge?: number }[] = [
    { id: "split", label: "Split view", icon: Columns2 },
    { id: "guest", label: "Guest phone", icon: Smartphone },
    { id: "kiosk", label: "Cashier dashboard", icon: Store, badge: newOrders + help },
    { id: "door", label: "Admissions", icon: DoorOpen },
    { id: "signage", label: "QR signage", icon: QrCode },
  ];

  const phone = (
    <div className="w-full max-w-[390px] shrink-0">
      <div className="overflow-hidden rounded-[2.6rem] border-[10px] border-black bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_80px_-30px_rgba(7,87,181,0.45)]">
        <iframe
          key={`${phoneSrc}-${frameKey}`}
          src={phoneSrc}
          title="Guest phone"
          className="block h-[min(800px,calc(100dvh-140px))] w-full rounded-[1.9rem] bg-background"
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-[#0a0b0d] text-foreground">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <AngaLogo size={30} />
        <span className="hidden leading-tight md:block">
          <span className="block font-display text-[15px] font-extrabold">ANGA In-Seat</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-highlight">
            Product demo
          </span>
        </span>
        <div
          role="tablist"
          aria-label="Demo view"
          className="ml-2 flex gap-1 overflow-x-auto rounded-xl bg-white/[0.05] p-1"
        >
          {tabs.map((t) => {
            const on = view === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setView(t.id)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150",
                  on
                    ? "bg-primary text-white ring-2 ring-highlight"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                <span className="hidden lg:inline">{t.label}</span>
                {t.badge ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[11px] font-bold text-highlight-foreground">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <ResetButton onDone={() => setFrameKey((k) => k + 1)} />
      </header>

      <div className="relative flex min-h-0 flex-1">
        {view === "guest" || view === "split" ? (
          <>
            <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-white/10 p-4 xl:block">
              <ScenarioList journey={journey} onStart={start} />
              <div className="mt-6">
                <Controls onPhone={(j, src) => start(j, src)} />
              </div>
            </aside>
            <div className="flex min-w-0 flex-1 items-start justify-center gap-6 overflow-auto p-5">
              <div className="flex w-full max-w-[390px] flex-col">
                <select
                  aria-label="Journey"
                  value={journey.id}
                  onChange={(e) => start(JOURNEYS.find((j) => j.id === e.target.value)!)}
                  className="mb-3 h-11 rounded-[10px] border border-border bg-surface px-3 text-[14px] xl:hidden"
                >
                  {JOURNEYS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.tag} · {j.title}
                    </option>
                  ))}
                </select>
                <div className="mb-3 rounded-xl border border-white/10 bg-surface px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-highlight">
                    {journey.tag}
                  </p>
                  <p className="font-display text-[15px] font-bold">{journey.title}</p>
                  <p className="text-[12px] text-muted-foreground">{journey.steps}</p>
                </div>
                {phone}
              </div>
              {view === "split" ? (
                <div className="hidden min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 lg:block">
                  <iframe
                    key={`kiosk-${frameKey}`}
                    src="/staff?view=orders"
                    title="Cashier dashboard"
                    className="h-[calc(100dvh-110px)] w-full"
                  />
                </div>
              ) : (
                <div className="hidden w-80 shrink-0 lg:block xl:hidden">
                  <Controls onPhone={(j, src) => start(j, src)} />
                </div>
              )}
            </div>
          </>
        ) : (
          <iframe
            key={`${view}-${frameKey}`}
            src={
              view === "kiosk"
                ? "/staff?view=overview"
                : view === "door"
                  ? "/admissions"
                  : "/signage"
            }
            title={
              view === "kiosk" ? "Cashier dashboard" : view === "door" ? "Admissions" : "QR signage"
            }
            className="absolute inset-0 h-full w-full"
          />
        )}
      </div>
    </div>
  );
}

function ResetButton({ onDone }: { onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="ml-auto flex items-center gap-2">
      <span className="hidden text-[13px] text-muted-foreground sm:inline">
        Clear orders, SMS, admissions and stock?
      </span>
      <Button size="sm" variant="secondary" onClick={() => setConfirm(false)}>
        Keep
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          resetAllDemoData();
          setConfirm(false);
          onDone();
        }}
      >
        Reset
      </Button>
    </div>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="ml-auto h-10 text-muted-foreground"
      onClick={() => setConfirm(true)}
    >
      <RotateCcw /> <span className="hidden sm:inline">Reset demo</span>
    </Button>
  );
}

function ScenarioList({ journey, onStart }: { journey: Journey; onStart: (j: Journey) => void }) {
  return (
    <section aria-label="Journeys">
      <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <MonitorSmartphone aria-hidden className="size-4" /> Customer journeys
      </p>
      <ul className="mt-3 space-y-1.5">
        {JOURNEYS.map((j) => {
          const on = j.id === journey.id;
          return (
            <li key={j.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onStart(j)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150",
                  on ? "border-highlight bg-highlight-soft" : "border-transparent hover:bg-surface",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[11px] font-bold uppercase tracking-[0.12em]",
                      on ? "text-highlight" : "text-subtle",
                    )}
                  >
                    {j.tag}
                  </span>
                  <span className="block font-display text-[14px] font-bold">{j.title}</span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Demo controls: everything the presenter can trigger without touching the phone. */
function Controls({ onPhone }: { onPhone: (j: Journey, src: string) => void }) {
  const dev = useDev();
  const orders = useOrders();
  const admissions = useAdmissions();
  const sms = useSms();
  const now = useNow(1000);
  const hydrated = useHydrated();
  const [note, setNote] = useState<string | null>(null);
  const [ref, setRef] = useState("ANGA-93941518");
  const [venue, setVenue] = useState<VenueId>("sky");
  const [screen, setScreen] = useState(2);
  const [seat, setSeat] = useState("F7");
  const bookings = hydrated ? getBookings(nairobiMinutes(new Date(now))) : [];
  const latest = orders.find((o) => isOpenOrder(o.status) && nextStatus(o.status));
  const lastSms = sms.find((m) => m.bookingRef === ref);

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(null), 3500);
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Demo controls
      </p>
      {note ? (
        <p role="status" className="rounded-xl bg-success-soft px-3 py-2 text-[13px] text-success">
          {note}
        </p>
      ) : null}

      <Panel title="M-Pesa result">
        <div role="radiogroup" className="grid gap-1.5">
          {(Object.keys(PAYMENT_OUTCOME_LABEL) as PaymentOutcome[]).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={dev.paymentOutcome === o}
              onClick={() => devStore.set({ ...dev, paymentOutcome: o })}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-[13px]",
                dev.paymentOutcome === o
                  ? "border-link bg-primary-soft text-link"
                  : "border-border",
              )}
            >
              {PAYMENT_OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
        <label className="mt-2.5 flex items-center justify-between gap-3 text-[13px]">
          Duplicate callback
          <input
            type="checkbox"
            checked={dev.duplicateCallback}
            onChange={(e) => devStore.set({ ...dev, duplicateCallback: e.target.checked })}
            className="size-5 accent-[#0757b5]"
          />
        </label>
      </Panel>

      <Panel title="Orders">
        <div className="grid gap-2">
          <Button
            size="sm"
            className="h-10"
            onClick={() =>
              flash(
                simulateIncomingOrder("all")
                  ? "Incoming order created and paid."
                  : "No screening is on right now.",
              )
            }
          >
            <Plus /> Simulate incoming order
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-10"
            disabled={!latest}
            onClick={() => {
              if (!latest) return;
              const to = nextStatus(latest.status)!;
              transitionOrder(latest.id, latest.status, to, "staff");
              flash(`${latest.number} → ${STATUS_LABEL[to]}`);
            }}
          >
            <FastForward /> Advance latest order
          </Button>
          <p className="text-[12px] text-muted-foreground">
            {latest ? (
              <>
                Latest: <b className="text-foreground">{latest.number}</b> ·{" "}
                {STATUS_LABEL[latest.status]} · seat {latest.seat}
              </>
            ) : (
              "No open orders yet."
            )}
          </p>
        </div>
      </Panel>

      <Panel title="Ticket validation & SMS">
        <select
          aria-label="Booking"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface-2 px-2 text-[13px]"
        >
          {bookings.map((b) => (
            <option key={b.ref} value={b.ref}>
              {b.ref} · {b.customer}
            </option>
          ))}
          <option value="ANGA-00000000">ANGA-00000000 · invalid</option>
        </select>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-10"
            onClick={() => {
              const r = validateTicket(findBooking(ref, nairobiMinutes(new Date())));
              if (r.ok) {
                admitTicket(r.booking);
                flash(`${r.booking.customer} admitted.`);
              } else
                flash(
                  r.reason === "ended"
                    ? "Rejected: screening has ended."
                    : "Rejected: ticket not found.",
                );
            }}
          >
            Validate
          </Button>
          <Button
            size="sm"
            className="h-10"
            disabled={!admissions[ref] || lastSms?.status === "sending"}
            onClick={() => {
              const b = findBooking(ref, nairobiMinutes(new Date()));
              if (!b) return;
              sendOrderingSms(b, window.location.origin);
              flash(lastSms ? "SMS resent. The old link no longer works." : "Ordering SMS sent.");
            }}
          >
            <Send /> {lastSms ? "Resend" : "Send SMS"}
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          {admissions[ref] ? (
            <StatusBadge tone="success">Admitted</StatusBadge>
          ) : (
            <StatusBadge tone="muted">Not admitted</StatusBadge>
          )}{" "}
          {lastSms ? (
            <StatusBadge tone={lastSms.status === "sent" ? "success" : "warn"}>
              SMS {lastSms.status}
            </StatusBadge>
          ) : null}
        </p>
        {lastSms ? (
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-9 w-full"
            onClick={() => onPhone(JOURNEYS[0]!, `/t/${lastSms.link.split("/t/")[1]}`)}
          >
            Open the SMS link on the phone
          </Button>
        ) : null}
      </Panel>

      <Panel title="Seat QR entry">
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="Cinema"
            value={venue}
            onChange={(e) => {
              setVenue(e.target.value as VenueId);
              setScreen(1);
            }}
            className="h-10 rounded-lg border border-border bg-surface-2 px-1.5 text-[13px]"
          >
            {(Object.keys(VENUES) as VenueId[]).map((v) => (
              <option key={v} value={v}>
                {v === "sky" ? "Sky" : "Diamond"}
              </option>
            ))}
          </select>
          <select
            aria-label="Screen"
            value={screen}
            onChange={(e) => setScreen(Number(e.target.value))}
            className="h-10 rounded-lg border border-border bg-surface-2 px-1.5 text-[13px]"
          >
            {VENUE_SCREENS[venue].map((s) => (
              <option key={s} value={s}>
                Scr {s}
              </option>
            ))}
          </select>
          <select
            aria-label="Seat"
            value={seat}
            onChange={(e) => setSeat(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface-2 px-1.5 text-[13px]"
          >
            {DEFAULT_SEAT_LAYOUT.rows
              .flatMap((r) => [1, 4, 7, 11].map((n) => `${r}${n}`))
              .map((s) => (
                <option key={s}>{s}</option>
              ))}
          </select>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2 h-10 w-full"
          onClick={() => onPhone(JOURNEYS[1]!, `/scan?seat=${seatCode(venue, screen, seat)}`)}
        >
          <QrCode /> Scan {seatCode(venue, screen, seat)} on the phone
        </Button>
      </Panel>

      <Panel title="Booking lookup & ordering window">
        <Button
          size="sm"
          variant="secondary"
          className="h-10 w-full"
          onClick={() => onPhone(JOURNEYS[3]!, "/booking")}
        >
          Open booking lookup on the phone
        </Button>
        <div
          role="radiogroup"
          aria-label="Ordering window"
          className="mt-2 grid grid-cols-3 gap-1.5"
        >
          {(["auto", "open", "closed"] as WindowOverride[]).map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={dev.windowOverride === w}
              onClick={() => devStore.set({ ...dev, windowOverride: w })}
              className={cn(
                "h-9 rounded-lg border text-[12px] font-semibold capitalize",
                dev.windowOverride === w
                  ? "border-link bg-primary-soft text-link"
                  : "border-border",
              )}
            >
              {w === "auto" ? "By film" : w}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Force ordering open or closed to show the cut-off state.
        </p>
      </Panel>
    </div>
  );
}
