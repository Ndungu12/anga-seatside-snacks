import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useState } from "react";

import { AppShell, PageTitle } from "@/components/anga/AppShell";
import { ActionBar } from "@/components/anga/CartBar";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { ClosedNotice, LoadingBlock } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VENUES } from "@/lib/data";
import { formatClock, nairobiMinutes, parseSeat, seatExists } from "@/lib/rules";
import { findScreening, FILMS, seatLayoutFor } from "@/lib/schedule";
import { sessionFromScreening } from "@/lib/sessions";
import { startSession, useHydrated, useNow, useOrderingWindow, useSession } from "@/lib/store";
import { cn } from "@/lib/utils";

type SeatSearch = { screening?: string | undefined };

export const Route = createFileRoute("/seat")({
  validateSearch: (search: Record<string, unknown>): SeatSearch => ({
    screening: typeof search["screening"] === "string" ? search["screening"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your seat — Anga Seat Order" },
      {
        name: "description",
        content: "Tell us your seat number so we can bring your order to you.",
      },
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

  const screening = screeningId
    ? findScreening(screeningId, nairobiMinutes(new Date(now)))
    : undefined;
  // Warn before the seat step if this show has already passed the cutoff.
  const orderWindow = useOrderingWindow(screening ? formatClock(screening.end) : undefined);

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
        <PageTitle>We can't find that screening</PageTitle>
        <p className="mt-2 text-[15px] text-muted-foreground">Please choose your show again.</p>
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
    startSession(sessionFromScreening(screening.venue, screening, parsed.label, null));
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
      footer={
        <ActionBar>
          <p className="min-w-0 flex-1 text-[15px]">
            {selected ? (
              <>
                <span className="text-muted-foreground">Seat </span>
                <span className="font-display text-xl font-semibold text-highlight">
                  {selected}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No seat chosen yet</span>
            )}
          </p>
          <Button onClick={confirm} className="min-w-40">
            Continue to menu
          </Button>
        </ActionBar>
      }
    >
      <div className="mx-auto max-w-xl">
        <section
          aria-label="Your show"
          className="flex items-start justify-between gap-4 border-b border-border pb-4"
        >
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">{film.title}</p>
            <p className="text-[13px] text-muted-foreground tabular">
              {VENUES[screening.venue]} · Screen {screening.screen} · {formatClock(screening.start)}
              –{formatClock(screening.end)}
            </p>
          </div>
          <Link
            to="/show"
            search={{ venue: screening.venue }}
            className="flex h-11 shrink-0 items-center text-[14px] font-medium text-link"
          >
            Change
          </Link>
        </section>

        {orderWindow.closed ? (
          <div className="mt-5">
            <ClosedNotice end={formatClock(screening.end)} cutoff={orderWindow.cutoff} />
          </div>
        ) : null}

        <div className="mt-6">
          <PageTitle>What's your seat number?</PageTitle>
          <p className="mt-1 text-[15px] text-muted-foreground">
            It's on your ticket and on the back of the seat.
          </p>
        </div>

        <form
          className="mt-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <Label htmlFor="seat-input" className="text-sm font-medium">
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
            className="mt-2 h-13 rounded-lg border-input bg-muted font-display text-xl font-semibold uppercase tracking-wider md:text-xl"
          />
          <p
            id="seat-hint"
            className={
              showError ? "mt-2 text-sm text-destructive" : "mt-2 text-[13px] text-muted-foreground"
            }
            role={showError ? "alert" : undefined}
          >
            {showError ? errorText : "Type it, or tap your seat on the map."}
          </p>

          <p className="mt-5 border-l-2 border-input pl-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Ordering for a group?</span> Use the seat
            of the person who will receive the order.
          </p>
        </form>
      </div>

      <section aria-label={`Seat map for screen ${screening.screen}`} className="mt-8">
        <p className="mb-3 text-center text-[13px] text-muted-foreground sm:hidden">
          Scroll sideways to see every seat.
        </p>
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="mx-auto w-max">
            <div
              aria-hidden
              className="mx-auto mb-1 h-1 w-3/4 rounded-full bg-muted-foreground/40"
            />
            <p
              aria-hidden
              className="mb-5 text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
            >
              Screen
            </p>
            {layout.rows.map((row) => (
              <div
                key={row}
                role="group"
                aria-label={`Row ${row}`}
                className="mb-1.5 flex items-center gap-1.5"
              >
                <span
                  aria-hidden
                  className="w-6 text-center text-[12px] font-medium text-muted-foreground"
                >
                  {row}
                </span>
                {Array.from({ length: layout.seatsPerRow }, (_, i) => i + 1).map((n) => {
                  const label = `${row}${n}`;
                  const isSel = selected === label;
                  return (
                    <Fragment key={label}>
                      {n === half + 1 ? <span aria-hidden className="w-5" /> : null}
                      <button
                        type="button"
                        onClick={() => choose(label)}
                        aria-label={`Row ${row}, seat ${n}`}
                        aria-pressed={isSel}
                        className={cn(
                          "size-10 rounded-t-md rounded-b-sm text-[12px] font-medium tabular transition-colors",
                          isSel
                            ? "bg-highlight font-semibold text-highlight-foreground"
                            : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {n}
                      </button>
                    </Fragment>
                  );
                })}
                <span
                  aria-hidden
                  className="w-6 text-center text-[12px] font-medium text-muted-foreground"
                >
                  {row}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
