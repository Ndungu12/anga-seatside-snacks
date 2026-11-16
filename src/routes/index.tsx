import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Film } from "lucide-react";

import { AppShell } from "@/components/anga/AppShell";
import { ClosedNotice, NoSession, OpenNotice } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { toVenueId, VENUES } from "@/lib/data";
import { parseClock } from "@/lib/rules";
import {
  startSession,
  useHydrated,
  useOrderingWindow,
  useSession,
  type Session,
} from "@/lib/store";

type SeatSearch = {
  venue?: string | undefined;
  screen?: string | undefined;
  seat?: string | undefined;
  end?: string | undefined;
};

// Search values may arrive as numbers (screen=2), so coerce to strings.
function str(v: unknown): string | undefined {
  return typeof v === "string" || typeof v === "number" ? String(v).trim() : undefined;
}

function sessionFromSearch(s: SeatSearch): Session | null {
  const venue = toVenueId(s.venue);
  const screen = s.screen ?? "";
  const seat = (s.seat ?? "").toUpperCase();
  if (!venue || !/^\d{1,2}$/.test(screen) || !/^[A-Z]{1,2}\d{1,3}$/.test(seat)) return null;
  if (parseClock(s.end) === null) return null;
  return { venue, screen, seat, end: s.end! };
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SeatSearch => ({
    venue: str(search["venue"]),
    screen: str(search["screen"]),
    seat: str(search["seat"]),
    end: str(search["end"]),
  }),
  head: () => ({
    meta: [
      { title: "Your seat — Anga Seat Order" },
      {
        name: "description",
        content: "Confirm your seat at Anga Diamond or Anga Sky and order snacks to it.",
      },
      { property: "og:title", content: "Anga Seat Order — order to your seat" },
      {
        property: "og:description",
        content: "Scan your seat code at Anga Cinemas, Nairobi, and get snacks and drinks delivered.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeatConfirmPage,
});

function SeatConfirmPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const stored = useSession();

  const fromUrl = sessionFromSearch(search);
  const hasParams = Boolean(search.venue || search.seat || search.screen || search.end);
  const session = fromUrl ?? (hydrated && !hasParams ? stored : null);
  const orderWindow = useOrderingWindow(session?.end);

  if (!session) {
    return (
      <AppShell showSeat={false}>
        {hasParams ? (
          <div role="alert" className="mb-2 rounded-2xl border-2 border-destructive p-4">
            <p className="font-bold text-destructive">This seat code didn't work</p>
            <p className="mt-1 text-base">Please scan it again, or ask an usher for help.</p>
          </div>
        ) : null}
        <NoSession />
      </AppShell>
    );
  }

  return (
    <AppShell showSeat={false}>
      <h1 className="font-display text-2xl font-bold">Is this your seat?</h1>
      <p className="mt-1 text-base text-muted-foreground">
        Check the details below before you order.
      </p>

      <section
        aria-label="Your seat"
        className="mt-6 overflow-hidden rounded-3xl border border-border bg-card px-6 py-6"
      >
        <p className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
          <Film aria-hidden className="size-4" /> Anga Cinemas
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold text-primary">
          {VENUES[session.venue]}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-y-5">
          <div>
            <dt className="text-sm text-muted-foreground">Screen</dt>
            <dd className="font-display text-3xl font-bold">{session.screen}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Seat</dt>
            <dd className="font-display text-3xl font-bold">{session.seat}</dd>
          </div>
        </dl>

        <div className="ticket-divider mt-6 pt-5">
          <dl className="flex items-baseline justify-between">
            <dt className="text-base text-muted-foreground">Film ends</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{session.end}</dd>
          </dl>
        </div>
      </section>

      <div className="mt-5 min-h-6">
        {hydrated ? (
          orderWindow.closed ? (
            <ClosedNotice end={session.end} cutoff={orderWindow.cutoff} />
          ) : orderWindow.closesAt ? (
            <OpenNotice closesAt={orderWindow.closesAt} />
          ) : null
        ) : null}
      </div>

      <Button
        size="lg"
        className="mt-6 w-full text-lg"
        onClick={() => {
          startSession(session);
          navigate({ to: "/menu" });
        }}
      >
        Start order
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Wrong seat? Scan the code on your seat again.
      </p>
    </AppShell>
  );
}
