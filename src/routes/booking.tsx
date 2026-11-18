import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { AppShell, PageTitle } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { SeatChoice, TicketCard } from "@/components/anga/BookingSummary";
import { ClosedNotice, Notice } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findBooking, type Booking } from "@/lib/bookings";
import { isOrderingClosed, nairobiMinutes, ORDER_CUTOFF_MINUTES } from "@/lib/rules";
import { sessionFromBooking } from "@/lib/sessions";
import { startSession } from "@/lib/store";

const DEMO_REFS = [
  { ref: "ANGA-93941518", digits: "518", note: "John Ndungu · sample e-ticket" },
  { ref: "AGB-48213", digits: "678", note: "Website · two seats" },
  { ref: "MP-90311", digits: "104", note: "M-Pesa Mini App" },
  { ref: "KB-77204", digits: "552", note: "Kenyabuzz · three seats" },
  { ref: "AGB-31007", digits: "219", note: "Screening already ended" },
  { ref: "ANGA-00000000", digits: "000", note: "Invalid reference" },
];

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Use your booking — Anga Seat Order" },
      {
        name: "description",
        content: "Fill in your seat from your Anga Cinemas or Kenyabuzz booking.",
      },
    ],
  }),
  component: BookingRefPage,
});

/** Flow 2B shortcut: pre-fill the show and seat from a booking or ticket reference. */
function BookingRefPage() {
  const navigate = useNavigate();
  const [ref, setRef] = useState("");
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [seat, setSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function lookUp() {
    setLoading(true);
    setError(null);
    // Simulated network lookup against the mock ticketing records.
    window.setTimeout(() => {
      setLoading(false);
      check();
    }, 900);
  }

  function check() {
    const b = findBooking(ref, nairobiMinutes(new Date()));
    // Same answer whether the reference or the digits are wrong: references can't be probed.
    if (!b || b.phoneLast3 !== digits.trim()) {
      setError("We couldn't find a booking with those details. Check both and try again.");
      return;
    }
    if (nairobiMinutes(new Date()) > b.screening.end) {
      setError(`That booking was for ${b.film} at ${b.start}, which has finished.`);
      return;
    }
    setError(null);
    setBooking(b);
    setSeat(b.tickets.length === 1 ? b.tickets[0]!.seat : null);
  }

  const back = (
    <BackButton>
      <Link to="/" aria-label="Back to start">
        <BackIcon />
      </Link>
    </BackButton>
  );

  if (booking) {
    const ticket = booking.tickets.find((t) => t.seat === seat) ?? null;
    const closed = isOrderingClosed(nairobiMinutes(new Date()), booking.screening.end);
    return (
      <AppShell back={back}>
        <PageTitle eyebrow="Booking found">Is this you?</PageTitle>
        <div className="mt-5">
          <TicketCard booking={booking} seat={seat} />
        </div>
        {closed ? (
          <div className="mt-5">
            <ClosedNotice end={booking.end} cutoff={ORDER_CUTOFF_MINUTES} />
          </div>
        ) : null}
        {booking.tickets.length > 1 ? (
          <div className="mt-6">
            <SeatChoice booking={booking} value={seat} onChange={setSeat} />
          </div>
        ) : null}
        <div className="mt-8 grid gap-3">
          <Button
            disabled={!ticket}
            onClick={() => {
              if (!ticket) return;
              startSession(sessionFromBooking(booking, ticket, "booking_ref", null));
              navigate({ to: "/menu" });
            }}
          >
            Browse the menu
          </Button>
          <Button variant="outline" onClick={() => setBooking(null)}>
            Not my booking
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back={back}>
      <PageTitle>Use your booking</PageTitle>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Works for tickets from the Anga website, the M-Pesa Mini App and Kenyabuzz.
      </p>
      <form
        className="mt-6 space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          lookUp();
        }}
      >
        <div>
          <Label htmlFor="ref" className="text-sm font-medium">
            Booking or ticket reference
          </Label>
          <Input
            id="ref"
            value={ref}
            onChange={(e) => setRef(e.target.value.toUpperCase().slice(0, 18))}
            placeholder="e.g. ANGA-93941518"
            autoCapitalize="characters"
            autoComplete="off"
            className="mt-2 h-12 rounded-lg border-input bg-muted font-display text-lg tracking-wide uppercase md:text-lg"
          />
        </div>
        <div>
          <Label htmlFor="digits" className="text-sm font-medium">
            Last 3 digits of the phone number on the booking
          </Label>
          <Input
            id="digits"
            value={digits}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="678"
            autoComplete="off"
            className="mt-2 h-12 w-32 rounded-lg border-input bg-muted font-display text-lg tracking-[0.3em] md:text-lg"
          />
        </div>
        {error ? <Notice tone="error" role="alert" title={error} /> : null}
        <Button
          type="submit"
          size="lg"
          className="h-13 w-full"
          disabled={!ref || digits.length !== 3 || loading}
        >
          {loading ? (
            <>
              <LoaderCircle aria-hidden className="motion-safe:animate-spin" /> Retrieving your
              booking…
            </>
          ) : (
            "Retrieve booking"
          )}
        </Button>
      </form>
      <section
        aria-label="Demo bookings"
        className="mt-8 rounded-2xl border border-dashed border-border p-4"
      >
        <p className="text-[13px] font-semibold">Demo bookings (tap to fill)</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {DEMO_REFS.map((d) => (
            <li key={d.ref}>
              <button
                type="button"
                onClick={() => {
                  setRef(d.ref);
                  setDigits(d.digits);
                  setError(null);
                }}
                className="flex w-full items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-left text-[13px] hover:bg-elevated"
              >
                <span>
                  <span className="block font-display font-bold tracking-wide">{d.ref}</span>
                  <span className="text-muted-foreground">{d.note}</span>
                </span>
                <span className="tabular text-muted-foreground">…{d.digits}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
