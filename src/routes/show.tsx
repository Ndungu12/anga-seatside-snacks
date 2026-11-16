import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, CircleAlert, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { LoadingBlock, VenuePicker } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toVenueId, VENUES } from "@/lib/data";
import {
  findCurrentScreenings,
  formatClock,
  nairobiMinutes,
  screeningTiming,
} from "@/lib/rules";
import { FILMS, getTodaySchedule, type Film, type Screening } from "@/lib/schedule";
import { useHydrated, useNow } from "@/lib/store";
import { cn } from "@/lib/utils";

type ShowSearch = { venue?: string | undefined };

export const Route = createFileRoute("/show")({
  validateSearch: (search: Record<string, unknown>): ShowSearch => ({
    venue: typeof search["venue"] === "string" ? search["venue"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "What are you watching? — Anga Seat Order" },
      { name: "description", content: "Pick today's film at Anga Diamond or Anga Sky to order to your seat." },
      { property: "og:title", content: "What are you watching? — Anga Seat Order" },
      { property: "og:description", content: "Choose your film and screening at Anga Cinemas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShowPage,
});

type FilmRow = { film: Film; screenings: Screening[]; current: Screening[] };

function ShowPage() {
  const search = Route.useSearch();
  const venue = toVenueId(search.venue);
  const hydrated = useHydrated();
  const now = useNow(30000);
  const nowMin = nairobiMinutes(new Date(now));
  const [query, setQuery] = useState("");
  const [pickedFilm, setPickedFilm] = useState<string | null>(null);
  const navigate = useNavigate();

  const rows = useMemo<FilmRow[]>(() => {
    if (!venue) return [];
    const byFilm = new Map<string, Screening[]>();
    for (const s of getTodaySchedule(venue, nowMin)) {
      byFilm.set(s.filmId, [...(byFilm.get(s.filmId) ?? []), s]);
    }
    return [...byFilm.entries()]
      .map(([filmId, screenings]) => ({
        film: FILMS[filmId]!,
        screenings,
        current: findCurrentScreenings(screenings, nowMin),
      }))
      .sort(
        (a, b) =>
          Number(Boolean(b.film.demo)) - Number(Boolean(a.film.demo)) ||
          Number(b.current.length > 0) - Number(a.current.length > 0) ||
          a.film.title.localeCompare(b.film.title),
      );
  }, [venue, nowMin]);

  const backToVenues = (
    <BackButton>
      <Link to="/" aria-label="Back to choose your cinema">
        <BackIcon />
      </Link>
    </BackButton>
  );

  if (!venue) {
    return (
      <AppShell back={backToVenues}>
        <h1 className="mb-4 font-display text-2xl font-bold">Which cinema are you in?</h1>
        <VenuePicker />
      </AppShell>
    );
  }

  if (!hydrated) {
    return (
      <AppShell back={backToVenues}>
        <LoadingBlock />
      </AppShell>
    );
  }

  function goToSeat(screening: Screening) {
    navigate({ to: "/seat", search: { screening: screening.id } });
  }

  function pickFilm(row: FilmRow) {
    if (row.current.length === 1) goToSeat(row.current[0]!);
    else setPickedFilm(row.film.id);
  }

  const picked = pickedFilm ? rows.find((r) => r.film.id === pickedFilm) : undefined;

  // Step 2b: more than one screening matches, or none does.
  if (picked) {
    const back = (
      <BackButton onClick={() => setPickedFilm(null)} label="Back to the film list" />
    );
    return (
      <AppShell back={back}>
        <p className="text-sm text-muted-foreground">{VENUES[venue]}</p>
        <h1 className="font-display text-2xl font-bold">{picked.film.title}</h1>

        {picked.current.length === 0 ? (
          <div role="alert" className="mt-6 rounded-2xl border-2 border-primary bg-primary-soft p-4">
            <p className="flex items-center gap-2 text-lg font-bold text-primary">
              <CircleAlert aria-hidden className="size-5 shrink-0" />
              We can't find a current screening.
            </p>
            <p className="mt-1 text-base">Please ask a member of staff.</p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-lg">This film is on more than one screen. Which one are you in?</p>
            <ul className="mt-4 grid gap-3">
              {picked.current.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToSeat(s)}
                    className="flex min-h-16 w-full items-center justify-between rounded-2xl border-2 border-border bg-card px-4 py-3 text-left hover:border-primary"
                  >
                    <span>
                      <span className="block font-display text-xl font-bold">Screen {s.screen}</span>
                      <span className="text-base text-muted-foreground">
                        {formatClock(s.start)} to {formatClock(s.end)} · {screeningTiming(s, nowMin)}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-6 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <Button variant="outline" className="mt-6 w-full" onClick={() => setPickedFilm(null)}>
          Choose a different film
        </Button>
      </AppShell>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.film.title.toLowerCase().includes(q)) : rows;

  return (
    <AppShell back={backToVenues}>
      <p className="text-sm text-muted-foreground">{VENUES[venue]} · today</p>
      <h1 className="font-display text-2xl font-bold">What are you watching?</h1>

      <div className="relative mt-4">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <label htmlFor="film-search" className="sr-only">
          Search today's films
        </label>
        <Input
          id="film-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search films"
          autoComplete="off"
          className="h-14 rounded-xl border-2 pl-12 text-lg md:text-lg"
        />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "film" : "films"} found
      </p>

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-base text-muted-foreground">
          No films match "{query}". Check the spelling or clear the search.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {visible.map((row) => (
            <li key={row.film.id}>
              <button
                type="button"
                onClick={() => pickFilm(row)}
                className={cn(
                  "flex min-h-20 w-full items-center justify-between gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left hover:border-primary",
                  row.current.length > 0 ? "border-border" : "border-border/60",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-lg font-bold leading-snug">{row.film.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {row.film.rating} · {row.film.runtime} min ·{" "}
                    {row.screenings.map((s) => formatClock(s.start)).join(", ")}
                  </span>
                  {row.current.length > 0 ? (
                    <span className="mt-1 inline-block rounded-md border border-primary px-1.5 py-0.5 text-xs font-semibold text-primary">
                      Showing now
                    </span>
                  ) : null}
                </span>
                <ChevronRight aria-hidden className="size-6 shrink-0 text-primary" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

