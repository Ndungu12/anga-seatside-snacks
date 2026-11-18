import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  LoaderCircle,
  MessageSquareText,
  ScanLine,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { AngaLogo } from "@/components/anga/Brand";
import { StatusBadge } from "@/components/anga/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  admitTicket,
  fmtNairobiTime,
  sendOrderingSms,
  validateTicket,
  type Validation,
} from "@/lib/admission";
import { findBooking, getBookings, TICKET_CHANNEL_LABEL, type Booking } from "@/lib/bookings";
import { VENUES } from "@/lib/data";
import { nairobiMinutes } from "@/lib/rules";
import { tamper } from "@/lib/tokens";
import { useAdmissions, useHydrated, useNow, useSms } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admissions")({
  head: () => ({
    meta: [
      { title: "Admissions — ANGA In-Seat" },
      {
        name: "description",
        content: "Simulated ticket admission that sends the in-seat ordering SMS.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdmissionsPage,
});

/** A01–A03: the door workstation, standing in for the admissions app and SMS gateway. */
function AdmissionsPage() {
  const hydrated = useHydrated();
  const now = useNow(1000);
  const admissions = useAdmissions();
  const sms = useSms();
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Validation | null>(null);
  const bookings = hydrated ? getBookings(nairobiMinutes(new Date(now))) : [];

  function validate(ref: string) {
    setInput(ref);
    setChecking(true);
    setResult(null);
    window.setTimeout(() => {
      const r = validateTicket(findBooking(ref, nairobiMinutes(new Date())));
      if (r.ok) admitTicket(r.booking);
      setResult(r);
      setChecking(false);
    }, 600);
  }

  const booking = result && "booking" in result ? result.booking : undefined;
  const latestSms = booking ? sms.find((m) => m.bookingRef === booking.ref) : undefined;
  const admittedRefs = Object.values(admissions).sort((a, b) => b.admittedAt - a.admittedAt);

  return (
    <div className="theme-ops min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <div className="mr-auto flex items-center gap-3">
            <AngaLogo size={30} />
            <div>
              <p className="font-display text-[17px] font-extrabold">Admissions workstation</p>
              <p className="text-[12px] text-muted-foreground">
                Door scanning and ordering SMS · simulated, no real SMS is sent
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="h-11">
            <Link to="/staff">Cashier dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <section
            aria-label="Scan ticket"
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <h1 className="font-display text-[20px] font-extrabold">Scan a ticket</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Scan the QR on the guest's e-ticket, or type the booking or ticket reference.
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) validate(input.trim());
              }}
            >
              <div className="relative flex-1">
                <ScanLine
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-link"
                />
                <input
                  aria-label="Ticket or booking reference"
                  value={input}
                  onChange={(e) => setInput(e.target.value.toUpperCase())}
                  placeholder="e.g. ANGA-93941518"
                  className="h-13 w-full rounded-xl border border-border bg-surface-2 pl-11 pr-3 font-display text-[17px] font-bold tracking-wide placeholder:font-normal placeholder:text-subtle focus:border-link focus:outline-none"
                />
              </div>
              <Button type="submit" size="lg" className="h-13" disabled={checking || !input.trim()}>
                {checking ? <LoaderCircle className="motion-safe:animate-spin" /> : null} Validate
              </Button>
            </form>

            <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Demo tickets · tap to scan
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {bookings.map((b) => {
                const ended = nairobiMinutes(new Date(now)) > b.screening.end;
                return (
                  <li key={b.ref}>
                    <button
                      type="button"
                      onClick={() => validate(b.ref)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-link/50"
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-[14px] font-extrabold tracking-wide">
                          {b.ref}
                        </span>
                        <span className="block truncate text-[12px] text-muted-foreground">
                          {b.customer} · {TICKET_CHANNEL_LABEL[b.channel]}
                        </span>
                      </span>
                      {admissions[b.ref] ? (
                        <StatusBadge tone="success">Admitted</StatusBadge>
                      ) : ended ? (
                        <StatusBadge tone="warn">Ended</StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">Not yet</StatusBadge>
                      )}
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => validate("ANGA-00000000")}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-destructive/50 px-3 py-2.5 text-left text-[13px]"
                >
                  <CircleAlert aria-hidden className="size-4 text-destructive" />
                  Simulate an invalid ticket
                </button>
              </li>
            </ul>
          </section>

          <section aria-live="polite" aria-label="Validation result">
            {checking ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-[15px]">
                <LoaderCircle className="size-5 text-link motion-safe:animate-spin" /> Checking
                ticket {input}…
              </div>
            ) : result ? (
              result.ok ? (
                <AdmittedPanel
                  booking={result.booking}
                  alreadyAt={result.alreadyAt}
                  admittedAt={admissions[result.booking.ref]?.admittedAt ?? Date.now()}
                  smsStatus={latestSms?.status}
                  sentBefore={Boolean(latestSms)}
                />
              ) : (
                <div
                  role="alert"
                  className={cn(
                    "rounded-2xl border p-5",
                    result.reason === "ended"
                      ? "border-warning/50 bg-warning-soft"
                      : "border-destructive/50 bg-destructive-soft",
                  )}
                >
                  <p className="flex items-center gap-2 font-display text-[18px] font-extrabold">
                    {result.reason === "ended" ? (
                      <Clock aria-hidden className="size-5 text-warning" />
                    ) : (
                      <CircleAlert aria-hidden className="size-5 text-destructive" />
                    )}
                    {result.reason === "ended" ? "Screening has ended" : "Ticket not found"}
                  </p>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    {result.reason === "ended" && result.booking
                      ? `${result.booking.ref} was for ${result.booking.film} at ${result.booking.start}. Entry and in-seat ordering are closed.`
                      : `No booking matches "${input}". Check the reference or send the guest to the box office.`}
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[14px] text-subtle">
                Validation results appear here.
              </div>
            )}
          </section>

          <section
            aria-label="Recent admissions"
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <h2 className="font-display text-[16px] font-bold">Recent admissions</h2>
            {admittedRefs.length === 0 ? (
              <p className="mt-2 text-[14px] text-subtle">No one admitted yet this session.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {admittedRefs.map((a) => {
                  const b = bookings.find((x) => x.ref === a.bookingRef);
                  return (
                    <li
                      key={a.bookingRef}
                      className="flex items-center justify-between gap-3 py-2.5 text-[14px]"
                    >
                      <span>
                        <span className="font-semibold">{b?.customer ?? a.bookingRef}</span>
                        <span className="block text-[12px] text-muted-foreground">
                          {a.bookingRef} ·{" "}
                          {b ? `${b.film} · Seats ${b.tickets.map((t) => t.seat).join(", ")}` : ""}
                        </span>
                      </span>
                      <span className="text-right text-[12px] text-muted-foreground">
                        Admitted {fmtNairobiTime(a.admittedAt)}
                        <span className="block">{a.token ? "SMS sent" : "No SMS yet"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section
          aria-label="SMS outbox"
          className="h-fit rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-6"
        >
          <h2 className="flex items-center gap-2 font-display text-[18px] font-extrabold">
            <MessageSquareText aria-hidden className="size-5 text-link" /> SMS outbox
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Each link is signed, tied to its booking, works on one phone and expires 15 minutes
            after the film ends. Resending switches the previous link off.
          </p>
          {sms.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-10 text-center text-[14px] text-subtle">
              Admit a ticket and send the ordering SMS.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sms.map((m) => {
                const current = m.link.endsWith(admissions[m.bookingRef]?.token ?? "");
                const b = bookings.find((x) => x.ref === m.bookingRef);
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "rounded-xl border p-3.5",
                      current ? "border-border bg-surface-2" : "border-border/60 opacity-60",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="font-semibold">{m.to}</span>
                      <span className="text-muted-foreground">· {m.bookingRef}</span>
                      <span className="ml-auto">
                        {!current ? (
                          <StatusBadge tone="muted">Replaced</StatusBadge>
                        ) : m.status === "sending" ? (
                          <StatusBadge tone="warn">Sending…</StatusBadge>
                        ) : (
                          <StatusBadge tone="success">Sent ✓</StatusBadge>
                        )}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-[13px] leading-relaxed text-muted-foreground">
                      {m.body}
                    </p>
                    <p className="mt-2 text-[12px] text-subtle">
                      Sent {fmtNairobiTime(m.at)} · link expires {fmtNairobiTime(m.expiresAt)}
                    </p>
                    {current ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" className="h-10">
                          <a href={m.link} target="_blank" rel="noreferrer">
                            Open as guest
                          </a>
                        </Button>
                        {b ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10"
                            onClick={() => sendOrderingSms(b, window.location.origin)}
                          >
                            <Send /> Resend
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="ghost" className="h-10">
                          <a href={tamper(m.link)} target="_blank" rel="noreferrer">
                            Try a tampered link
                          </a>
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function AdmittedPanel({
  booking,
  alreadyAt,
  admittedAt,
  smsStatus,
  sentBefore,
}: {
  booking: Booking;
  alreadyAt: number | null;
  admittedAt: number;
  smsStatus: "sending" | "sent" | undefined;
  sentBefore: boolean;
}) {
  const rows: [string, string][] = [
    ["Customer", booking.customer],
    ["Booking", booking.ref],
    ["Cinema", VENUES[booking.venue]],
    ["Film", booking.film],
    ["Screening", `Today ${booking.start} · Screen ${booking.screen}`],
    ["Seat(s)", booking.tickets.map((t) => t.seat).join(", ")],
  ];
  return (
    <div role="status" className="overflow-hidden rounded-2xl border border-success/50 bg-surface">
      <div className="flex items-center gap-3 bg-success-soft px-5 py-4">
        <CircleCheck aria-hidden className="size-7 text-success" />
        <div className="flex-1">
          <p className="font-display text-[18px] font-extrabold">Ticket valid · admitted</p>
          <p className="text-[13px] text-muted-foreground">
            {alreadyAt
              ? `Already admitted at ${fmtNairobiTime(alreadyAt)}`
              : `Admitted at ${fmtNairobiTime(admittedAt)}`}
          </p>
        </div>
        {alreadyAt ? (
          <StatusBadge tone="warn">
            <TriangleAlert className="size-3" /> Re-scan
          </StatusBadge>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-[14px]">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
              {k}
            </dt>
            <dd className="mt-0.5 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
        <Button
          size="lg"
          disabled={smsStatus === "sending"}
          onClick={() => sendOrderingSms(booking, window.location.origin)}
        >
          {smsStatus === "sending" ? (
            <LoaderCircle className="motion-safe:animate-spin" />
          ) : (
            <Send />
          )}
          {smsStatus === "sending"
            ? "Sending SMS…"
            : sentBefore
              ? "Resend ordering SMS"
              : "Send ordering SMS"}
        </Button>
        <p className="text-[13px] text-muted-foreground">
          To {booking.phoneMasked}
          {smsStatus === "sent" ? " · delivered ✓" : ""}
        </p>
      </div>
    </div>
  );
}
