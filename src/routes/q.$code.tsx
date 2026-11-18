import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/anga/AppShell";
import { LoadingBlock, Notice } from "@/components/anga/Notices";
import { SeatCodeForm } from "@/components/anga/SeatCodeForm";
import { Button } from "@/components/ui/button";
import { VENUES } from "@/lib/data";
import {
  isRateLimited,
  MAX_OPEN_ORDERS_PER_SEAT,
  nairobiMinutes,
  parseSeatCode,
  resolveSeatScreening,
  seatExists,
  seatOrderLimitReached,
  SEAT_SCAN_WINDOW_MS,
} from "@/lib/rules";
import { getTodaySchedule, seatLayoutFor, VENUE_SCREENS } from "@/lib/schedule";
import { sessionFromScreening } from "@/lib/sessions";
import {
  openOrdersForSeat,
  ordersStore,
  recordSeatScan,
  seatScanStore,
  startSession,
  useHydrated,
} from "@/lib/store";

export const Route = createFileRoute("/q/$code")({
  head: () => ({
    meta: [
      { title: "Your seat — Anga Seat Order" },
      { name: "description", content: "Order snacks to this seat at Anga Cinemas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeatQrPage,
});

type Problem =
  | { kind: "bad_code" }
  | { kind: "no_seat"; label: string }
  | { kind: "rate_limited" }
  | { kind: "no_screening"; label: string }
  | { kind: "seat_full"; label: string };

/** Flow 2A: the QR on a seat. Resolves the current screening and goes straight to the menu. */
function SeatQrPage() {
  const { code } = Route.useParams();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!hydrated || ran.current) return;
    ran.current = true;
    const now = Date.now();
    const parsed = parseSeatCode(code);
    if (!parsed) return setProblem({ kind: "bad_code" });
    const label = `${VENUES[parsed.venue]}, Screen ${parsed.screen}, seat ${parsed.seat}`;
    // Seat validation: the hall and the seat must both exist.
    if (
      !VENUE_SCREENS[parsed.venue].includes(parsed.screen) ||
      !seatExists(seatLayoutFor(parsed.venue, parsed.screen), parsed.seat)
    ) {
      return setProblem({ kind: "no_seat", label });
    }
    // Abuse prevention: one phone scanning many seats in a short time is blocked.
    if (isRateLimited(seatScanStore.get(), now)) return setProblem({ kind: "rate_limited" });
    recordSeatScan(now);

    const nowMin = nairobiMinutes(new Date(now));
    const hall = getTodaySchedule(parsed.venue, nowMin).filter((s) => s.screen === parsed.screen);
    const screening = resolveSeatScreening(hall, nowMin);
    if (!screening)
      return setProblem({
        kind: "no_screening",
        label: `Screen ${parsed.screen}, ${VENUES[parsed.venue]}`,
      });
    if (
      seatOrderLimitReached(openOrdersForSeat(ordersStore.get(), screening.id, parsed.seat).length)
    ) {
      return setProblem({ kind: "seat_full", label: `seat ${parsed.seat}` });
    }
    startSession(
      sessionFromScreening(parsed.venue, screening, parsed.seat, { seatCode: code.toUpperCase() }),
    );
    navigate({ to: "/menu", replace: true });
  }, [hydrated, code, navigate]);

  if (!problem) {
    return (
      <AppShell help={false}>
        <p className="text-[15px] text-muted-foreground">Finding your seat…</p>
        <LoadingBlock />
      </AppShell>
    );
  }

  const copy: Record<Problem["kind"], { title: string; body: string }> = {
    bad_code: {
      title: "We can't read that seat code",
      body: "Check the code printed under the QR, for example SKY-2-F7.",
    },
    no_seat: {
      title: "That seat doesn't exist",
      body: `We can't find ${"label" in problem ? problem.label : "it"}. Check the code on the sign.`,
    },
    rate_limited: {
      title: "Too many seats scanned",
      body: `For everyone's safety we limit seat scans from one phone. Try again in ${Math.round(SEAT_SCAN_WINDOW_MS / 60000)} minutes or ask an usher.`,
    },
    no_screening: {
      title: "No screening is on here right now",
      body: `There's nothing showing in ${"label" in problem ? problem.label : "this hall"} at the moment, so we can't take orders for this seat.`,
    },
    seat_full: {
      title: "This seat already has orders on the way",
      body: `There are ${MAX_OPEN_ORDERS_PER_SEAT} open orders for ${"label" in problem ? problem.label : "this seat"}. Please wait for them or ask an usher.`,
    },
  };

  return (
    <AppShell help={false}>
      <Notice tone="attention" role="alert" title={copy[problem.kind].title}>
        {copy[problem.kind].body}
      </Notice>
      <div className="mt-8">
        <SeatCodeForm />
      </div>
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link to="/">Order another way</Link>
      </Button>
    </AppShell>
  );
}
