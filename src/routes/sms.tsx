import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Wordmark } from "@/components/anga/AppShell";
import { Button } from "@/components/ui/button";
import { admitBooking, fmtNairobiTime } from "@/lib/admission";
import { getBookings, TICKET_CHANNEL_LABEL } from "@/lib/bookings";
import { VENUES } from "@/lib/data";
import { nairobiMinutes } from "@/lib/rules";
import { useHydrated, useSms } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sms")({
  head: () => ({
    meta: [
      { title: "Messages — Anga Seat Order demo" },
      {
        name: "description",
        content: "Simulated guest phone receiving the ordering SMS after admission.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SmsPage,
});

/** Flow 1 start: the guest's phone. Show the ticket at the door, receive the SMS, tap the link. */
function SmsPage() {
  const hydrated = useHydrated();
  const sms = useSms();
  const bookings = hydrated ? getBookings(nairobiMinutes(new Date())) : [];
  const [ref, setRef] = useState("AGB-48213");
  const booking = bookings.find((b) => b.ref === ref) ?? bookings[0];
  const thread = sms
    .filter((m) => m.bookingRef === booking?.ref)
    .slice()
    .reverse();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <span className="font-display text-[15px] font-semibold">Messages</span>
        <span className="text-[12px] text-muted-foreground">Simulated phone</span>
      </header>

      {!hydrated || !booking ? null : (
        <main className="flex flex-1 flex-col px-4 pb-6 pt-4">
          <div
            className="flex gap-1.5 overflow-x-auto pb-3"
            role="radiogroup"
            aria-label="Whose phone"
          >
            {bookings.map((b) => (
              <button
                key={b.ref}
                type="button"
                role="radio"
                aria-checked={b.ref === booking.ref}
                onClick={() => setRef(b.ref)}
                className={cn(
                  "h-9 shrink-0 rounded-md border px-3 text-[13px]",
                  b.ref === booking.ref
                    ? "border-link text-link"
                    : "border-border text-muted-foreground",
                )}
              >
                {TICKET_CHANNEL_LABEL[b.channel]} · {b.customer}
              </button>
            ))}
          </div>

          <p className="text-center text-[12px] text-muted-foreground">
            ANGA CINEMAS · {booking.phoneMasked}
          </p>

          <div className="mt-4 flex-1 space-y-3">
            {thread.length === 0 ? (
              <div className="mt-6">
                <div className="border-y border-border py-4">
                  <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
                    Your e-ticket
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold">{booking.film}</p>
                  <p className="text-[13px] text-muted-foreground tabular">
                    {VENUES[booking.venue]} · Screen {booking.screen} · {booking.start} · Seats{" "}
                    {booking.tickets.map((t) => t.seat).join(", ")}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {booking.ref} · bought on {TICKET_CHANNEL_LABEL[booking.channel]}
                  </p>
                </div>
                <p className="mt-6 text-center text-[15px] text-muted-foreground">
                  No messages yet. Show your ticket at the door to be admitted.
                </p>
              </div>
            ) : (
              thread.map((m) => {
                const token = m.link.split("/t/")[1] ?? "";
                return (
                  <div
                    key={m.id}
                    className="max-w-[88%] rounded-xl rounded-bl-sm bg-secondary px-4 py-3"
                  >
                    <p className="text-[14px] leading-relaxed">
                      {m.body.split(m.link)[0]}
                      <Link
                        to="/t/$token"
                        params={{ token }}
                        className="break-all font-medium text-link underline underline-offset-2"
                      >
                        {m.link.replace(/^https?:\/\//, "").slice(0, 38)}…
                      </Link>
                      {m.body.split(m.link)[1]}
                    </p>
                    <p className="mt-1 text-right text-[11px] text-muted-foreground">
                      {fmtNairobiTime(m.at)}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6">
            {thread.length === 0 ? (
              <Button
                className="w-full"
                size="lg"
                onClick={() => admitBooking(booking, window.location.origin)}
              >
                Show ticket at the door
              </Button>
            ) : (
              <p className="text-center text-[13px] text-muted-foreground">
                Tap the link to order to your seat.
              </p>
            )}
            <p className="mt-3 text-center text-[12px] text-muted-foreground">
              <Wordmark sub="Admissions scans the ticket and sends this SMS" />
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
