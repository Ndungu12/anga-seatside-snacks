import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Fragment, useState } from "react";

import { AppShell } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { LoadingBlock } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VENUES } from "@/lib/data";
import { formatClock, nairobiMinutes, parseSeat, seatExists } from "@/lib/rules";
import { findScreening, FILMS, seatLayoutFor } from "@/lib/schedule";
import { startSession, useHydrated, useNow, useSession } from "@/lib/store";
import { cn } from "@/lib/utils";

type SeatSearch = { screening?: string | undefined };

export const Route = createFileRoute("/seat")({
  validateSearch: (search: Record<string, unknown>): SeatSearch => ({
    screening: typeof search["screening"] === "string" ? search["screening"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your seat — Anga Seat Order" },
      { name: "description", content: "Tell us your seat number so we can bring your order to you." },
      { property: "og:title", content: "Your seat — Anga Seat Order" },
      { property: "og:description", content: "Enter your seat number at Anga Cinemas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeatPage,
});

function SeatPage() {
  const { screening: screeningId } = Route.useSearch();
  const hydrated = useHydrated();
  const now = useNow(30000);
  const session = useSession();
  const navigate = useNavigate();
  const [typed, setTyped] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const screening = screeningId ? findScreening(screeningId, nairobiMinutes(new Date(now))) : undefined;

  if (!hydrated) {
    return (
      <AppShell>
        <LoadingBlock />
      </AppShell>
    );
  }

  if (!screening) {
    return (
      <AppShell
        back={
          <BackButton>
            <Link to="/" aria-label="Back to start">
              <BackIcon />
            </Link>
          </BackButton>
        }
      >
        <h1 className="font-display text-2xl font-bold">We can't find that screening</h1>
        <p className="mt-2 text-base text-muted-foreground">Please choose your show again.</p>
        <Button asChild className="mt-6">
          <Link to="/">Choose your show</Link>
        </Button>
      </AppShell>
    );
  }

  const film = FILMS[screening.filmId]!;
  const layout = seatLayoutFor(screening.venue, screening.screen);
  // Pre-fill the seat when the guest comes back to correct it.
  const value = typed ?? (session?.screeningId === screening.id ? session.seat : "");
  const parsed = parseSeat(value);
  const valid = seatExists(layout, value);
  const selected = valid ? parsed!.label : null;
  const lastRow = layout.rows[layout.rows.length - 1];
  const errorText = !value.trim()
    ? "Enter your seat number, for example F7."
    : `Seat ${value.trim().toUpperCase()} doesn't exist on Screen ${screening.screen}. Rows are A to ${lastRow} and seats 1 to ${layout.seatsPerRow}.`;
  const half = Math.ceil(layout.seatsPerRow / 2);

  function choose(label: string) {
    setTyped(label);
    setShowError(false);
  }

  function confirm() {
    if (!valid || !parsed || !screening) {
      setShowError(true);
      return;
    }
    startSession({
      venue: screening.venue,
      screeningId: screening.id,
      film: film.title,
      screen: String(screening.screen),
      start: formatClock(screening.start),
      end: formatClock(screening.end),
      seat: parsed.label,
    });
    navigate({ to: "/menu" });
  }

  return (
    <AppShell
      wide
      back={
        <BackButton>
          <Link to="/show" search={{ venue: screening.venue }} aria-label="Change show">
            <BackIcon />
          </Link>
        </BackButton>
      }
    >
      <div className="mx-auto max-w-md">
        <section aria-label="Your show" className="rounded-2xl border border-border bg-card p-4">
          <p className="text-lg font-bold leading-snug">{film.title}</p>
          <p className="text-base text-muted-foreground">
            {VENUES[screening.venue]} · Screen {screening.screen} · {formatClock(screening.start)} to{" "}
            {formatClock(screening.end)}
          </p>
          <Link
            to="/show"
            search={{ venue: screening.venue }}
            className="mt-1 inline-flex h-10 items-center text-sm text-primary underline underline-offset-4"
          >
            Wrong show? Change it
          </Link>
        </section>

        <h1 className="mt-6 font-display text-2xl font-bold">What's your seat number?</h1>
        <p className="mt-1 text-base text-muted-foreground">
          It's printed on your ticket and on the back of the seat.
        </p>

        <form
          className="mt-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <Label htmlFor="seat-input" className="text-base">
            Seat number
          </Label>
          <Input
            id="seat-input"
            value={value}
            onChange={(e) => {
              setTyped(e.target.value.toUpperCase().slice(0, 4));
              setShowError(false);
            }}
            onBlur={() => value.trim() && !valid && setShowError(true)}
            placeholder="e.g. F7"
            autoComplete="off"
            autoCapitalize="characters"
            aria-invalid={showError ? true : undefined}
            aria-describedby="seat-hint"
            className="mt-2 h-14 rounded-xl border-2 font-display text-2xl uppercase tracking-wider md:text-2xl"
          />
          <p
            id="seat-hint"
            className={showError ? "mt-2 text-base text-destructive" : "mt-2 text-sm text-muted-foreground"}
            role={showError ? "alert" : undefined}
          >
            {showError ? errorText : "Type it, or tap your seat on the map below."}
          </p>

          <p className="mt-4 flex gap-2 rounded-xl border border-border p-3 text-base">
            <Users aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            Ordering for a group? Use the seat of the person who will receive the order.
          </p>
        </form>
      </div>

      <section aria-label={`Seat map for screen ${screening.screen}`} className="mt-6">
        <p className="mb-2 text-center text-sm text-muted-foreground sm:hidden">
          Scroll sideways to see all seats.
        </p>
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="mx-auto w-max">
            <div aria-hidden className="mx-auto mb-1 h-1.5 w-3/4 rounded-full bg-muted-foreground/50" />
            <p aria-hidden className="mb-4 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Screen
            </p>
            {layout.rows.map((row) => (
              <div key={row} role="group" aria-label={`Row ${row}`} className="mb-1 flex items-center gap-1">
                <span aria-hidden className="w-6 text-center text-sm font-bold text-muted-foreground">
                  {row}
                </span>
                {Array.from({ length: layout.seatsPerRow }, (_, i) => i + 1).map((n) => {
                  const label = `${row}${n}`;
                  const isSel = selected === label;
                  return (
                    <Fragment key={label}>
                      {n === half + 1 ? <span aria-hidden className="w-4" /> : null}
                      <button
                        type="button"
                        onClick={() => choose(label)}
                        aria-label={`Row ${row}, seat ${n}`}
                        aria-pressed={isSel}
                        className={cn(
                          "size-11 rounded-lg border text-sm font-semibold tabular-nums",
                          isSel
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary",
                        )}
                      >
                        {n}
                      </button>
                    </Fragment>
                  );
                })}
                <span aria-hidden className="w-6 text-center text-sm font-bold text-muted-foreground">
                  {row}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 text-base">
            {selected ? (
              <>
                Seat <span className="font-display text-xl font-bold text-primary">{selected}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No seat chosen yet</span>
            )}
          </p>
          <Button size="lg" onClick={confirm}>
            Continue to menu
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
