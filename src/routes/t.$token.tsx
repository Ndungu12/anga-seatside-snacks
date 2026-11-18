import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell, PageTitle } from "@/components/anga/AppShell";
import { SeatChoice, TicketCard } from "@/components/anga/BookingSummary";
import { ActionBar } from "@/components/anga/CartBar";
import { ClosedNotice, LoadingBlock, Notice } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { bookingForLink } from "@/lib/bookings";
import { nairobiMinutes } from "@/lib/rules";
import { sessionFromBooking } from "@/lib/sessions";
import { verifyLinkToken, type LinkCheck } from "@/lib/tokens";
import {
  admissionsStore,
  bindLinkToDevice,
  startSession,
  useHydrated,
  useOrderingWindow,
  useSession,
} from "@/lib/store";

export const Route = createFileRoute("/t/$token")({
  head: () => ({
    meta: [
      { title: "Order to your seat — Anga Seat Order" },
      { name: "description", content: "Your Anga Cinemas booking, ready for in-seat ordering." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdmissionLinkPage,
});

type State =
  | { kind: "checking" }
  | { kind: "invalid"; reason: "malformed" | "bad_signature" | "unknown" | "replaced" }
  | { kind: "expired"; endedAt: string | null }
  | { kind: "other_device" }
  | { kind: "ok"; check: Extract<LinkCheck, { ok: true }> };

/** Flow 1: signed link sent by SMS after the ticket is admitted. */
function AdmissionLinkPage() {
  const { token } = Route.useParams();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const session = useSession();
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    if (!hydrated) return;
    const now = Date.now();
    const check = verifyLinkToken(token, now);
    if (!check.ok) {
      if (check.reason === "expired") {
        const b = check.payload
          ? bookingForLink(check.payload.b, check.payload.s, nairobiMinutes(new Date(now)))
          : undefined;
        setState({ kind: "expired", endedAt: b?.end ?? null });
      } else setState({ kind: "invalid", reason: check.reason });
      return;
    }
    // Only the latest link issued for a booking works; re-sending revokes the old one.
    const issued = admissionsStore.get()[check.payload.b];
    if (issued && issued.token !== token) return setState({ kind: "invalid", reason: "replaced" });
    if (!bindLinkToDevice(check.payload.n)) return setState({ kind: "other_device" });
    setState({ kind: "ok", check });
  }, [hydrated, token]);

  const payload = state.kind === "ok" ? state.check.payload : null;
  const booking = payload
    ? bookingForLink(payload.b, payload.s, nairobiMinutes(new Date()))
    : undefined;
  const sameBooking = session?.bookingRef === booking?.ref ? session?.seat : null;
  const [seat, setSeat] = useState<string | null>(null);
  const chosen =
    seat ?? sameBooking ?? (booking?.tickets.length === 1 ? booking.tickets[0]!.seat : null);
  const orderWindow = useOrderingWindow(booking?.end);

  if (!hydrated || state.kind === "checking") {
    return (
      <AppShell help={false}>
        <LoadingBlock />
      </AppShell>
    );
  }

  if (state.kind !== "ok" || !booking) {
    const copy =
      state.kind === "expired"
        ? {
            title: "This ordering link has expired",
            body: `Links stop working shortly after the film ends${state.endedAt ? ` (it ended at ${state.endedAt})` : ""}.`,
          }
        : state.kind === "other_device"
          ? {
              title: "This link is already open on another phone",
              body: "Each ordering link works on one phone. Use the phone you opened it on first, or order with the code on your seat.",
            }
          : state.kind === "invalid" && state.reason === "replaced"
            ? {
                title: "A newer link was sent",
                body: "Please use the most recent SMS from Anga Cinemas.",
              }
            : {
                title: "This link isn't valid",
                body: "It may be incomplete or changed. Open the link exactly as it came in the SMS.",
              };
    return (
      <AppShell help={false}>
        <Notice tone="attention" role="alert" title={copy.title}>
          {copy.body}
        </Notice>
        <div className="mt-8 grid gap-3">
          <Button asChild>
            <Link to="/">Order another way</Link>
          </Button>
          <p className="text-[13px] text-muted-foreground">
            Or ask an usher. Nothing has been charged.
          </p>
        </div>
      </AppShell>
    );
  }

  const ticket = booking.tickets.find((t) => t.seat === chosen) ?? null;

  function go() {
    if (!booking || !ticket) return;
    startSession(sessionFromBooking(booking, ticket, "admission_sms", token));
    navigate({ to: "/menu" });
  }

  return (
    <AppShell
      footer={
        <ActionBar>
          <p className="min-w-0 flex-1 text-[15px] text-muted-foreground">
            {ticket ? (
              <>
                Seat{" "}
                <span className="font-display text-xl font-semibold text-highlight">
                  {ticket.seat}
                </span>
              </>
            ) : (
              "Choose a seat"
            )}
          </p>
          <Button onClick={go} disabled={!ticket} className="min-w-40">
            Browse the menu
          </Button>
        </ActionBar>
      }
    >
      <PageTitle eyebrow="You're checked in · welcome to Anga">
        {booking.customer.split(" ")[0]}, your snacks are a tap away
      </PageTitle>
      <p className="mt-2 text-[15px] text-muted-foreground">
        We've filled in your booking. Nothing to type.
      </p>

      <div className="mt-6">
        <TicketCard booking={booking} seat={chosen} />
      </div>

      {orderWindow.closed ? (
        <div className="mt-6">
          <ClosedNotice end={booking.end} cutoff={orderWindow.cutoff} />
        </div>
      ) : null}

      {booking.tickets.length > 1 ? (
        <div className="mt-6">
          <SeatChoice booking={booking} value={chosen} onChange={setSeat} />
        </div>
      ) : null}

      <p className="mt-6 text-[13px] text-muted-foreground">
        This link is for your booking only and works until{" "}
        {new Intl.DateTimeFormat("en-GB", {
          timeZone: "Africa/Nairobi",
          hour: "2-digit",
          minute: "2-digit",
        }).format(state.check.payload.exp)}
        . Please don't forward it.
      </p>
    </AppShell>
  );
}
