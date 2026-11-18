import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell, PageTitle, SectionLabel } from "@/components/anga/AppShell";
import { Poster } from "@/components/anga/Poster";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { LoadingBlock, Notice, VenuePicker } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { campaignSearch, toVenueId, VENUES, type CampaignSearch } from "@/lib/data";
import { findCurrentScreenings, formatClock, nairobiMinutes, screeningTiming } from "@/lib/rules";
import { FILMS, getTodaySchedule, type Film, type Screening } from "@/lib/schedule";
import { useHydrated, useNow } from "@/lib/store";

type ShowSearch = { venue?: string | undefined } & CampaignSearch;

export const Route = createFileRoute("/show")({
  validateSearch: (search: Record<string, unknown>): ShowSearch => ({
    venue: typeof search["venue"] === "string" ? search["venue"] : undefined,
    ...campaignSearch(search),
  }),
  head: () => ({
    meta: [
      { title: "What are you watching? — Anga Seat Order" },
      {
        name: "description",
        content: "Pick today's film at Anga Diamond or Anga Sky to order to your seat.",
      },
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

  const { venue: _v, ...campaign } = search;
  void _v;

  if (!venue) {
    return (
      <AppShell back={backToVenues} wide>
        <PageTitle eyebrow="Step 1 of 3">Which cinema are you in?</PageTitle>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Choose your cinema to see what's showing now.
        </p>
        <div className="mt-6">
          <VenuePicker search={campaign} />
        </div>
      </AppShell>
    );
  }

  if (!hydrated) {
    return (
      <AppShell back={backToVenues} wide>
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

  // More than one screening matches, or none does.
  if (picked) {
    const back = <BackButton onClick={() => setPickedFilm(null)} label="Back to the film list" />;
    return (
      <AppShell back={back} wide>
        <div className="flex gap-5">
          <Poster title={picked.film.title} rating={picked.film.rating} className="w-28 shrink-0" />
          <div className="min-w-0">
            <PageTitle eyebrow={VENUES[venue]}>{picked.film.title}</PageTitle>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {picked.film.rating} · {picked.film.runtime} min
            </p>
          </div>
        </div>

        {picked.current.length === 0 ? (
          <Notice
            tone="attention"
            role="alert"
            title="We can't find a current screening."
            className="mt-6"
          >
            Please ask a member of staff, or choose another film.
          </Notice>
        ) : (
          <>
            <p className="mt-6 text-[15px] text-muted-foreground">
              This film is on more than one screen right now. Which one are you in?
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {picked.current.map((sc) => (
                <li key={sc.id}>
                  <button
                    type="button"
                    onClick={() => goToSeat(sc)}
                    className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition-colors duration-150 hover:border-link/60"
                  >
                    <span>
                      <span className="block font-display text-lg font-extrabold">
                        Screen {sc.screen}
                      </span>
                      <span className="text-[13px] text-muted-foreground tabular">
                        {formatClock(sc.start)}–{formatClock(sc.end)} ·{" "}
                        {screeningTiming(sc, nowMin)}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-5 text-muted-foreground group-hover:text-link"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <Button
          variant="secondary"
          className="mt-8 w-full sm:w-auto"
          onClick={() => setPickedFilm(null)}
        >
          Choose a different film
        </Button>
      </AppShell>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.film.title.toLowerCase().includes(q)) : rows;
  const onNow = visible.filter((r) => r.current.length > 0);
  const later = visible.filter((r) => r.current.length === 0);

  const card = (row: FilmRow) => {
    const live = row.current[0];
    return (
      <li key={row.film.id}>
        <button
          type="button"
          onClick={() => pickFilm(row)}
          className="group block w-full text-left"
          aria-label={`${row.film.title}, ${row.film.rating}${live ? ", showing now" : ""}`}
        >
          <div className="relative">
            <Poster
              title={row.film.title}
              rating={`${row.film.rating} · ${row.film.runtime} min`}
              className="transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            {live ? (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-highlight px-1.5 py-0.5 text-[11px] font-bold text-highlight-foreground">
                <span className="size-1.5 rounded-full bg-highlight-foreground" /> Now
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-1 font-display text-[14px] font-bold">{row.film.title}</p>
          <p className="text-[12px] text-muted-foreground tabular">
            {live
              ? `Screen ${live.screen} · ${screeningTiming(live, nowMin)}`
              : row.screenings
                  .map((x) => formatClock(x.start))
                  .slice(0, 3)
                  .join(" · ")}
          </p>
          {row.film.demo ? <p className="mt-0.5 text-[11px] text-subtle">{row.film.demo}</p> : null}
        </button>
      </li>
    );
  };

  return (
    <AppShell back={backToVenues} wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow={`Step 2 of 3 · ${VENUES[venue]} · Today`}>
          What are you watching?
        </PageTitle>
        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
          />
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
            className="h-12 rounded-xl border-border bg-surface-2 pl-10 text-base md:text-base"
          />
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "film" : "films"} found
      </p>

      {visible.length === 0 ? (
        <p className="mt-10 text-[15px] text-muted-foreground">
          No films match "{query}". Check the spelling or clear the search.
        </p>
      ) : (
        <>
          {onNow.length ? (
            <section className="mt-8">
              <SectionLabel className="mb-3">Showing now</SectionLabel>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                {onNow.map(card)}
              </ul>
            </section>
          ) : null}
          {later.length ? (
            <section className="mt-10">
              <SectionLabel className="mb-3">Later today</SectionLabel>
              <ul className="grid grid-cols-3 gap-3 opacity-80 sm:grid-cols-5 lg:grid-cols-6">
                {later.map(card)}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
