// Mock "today" schedule for both venues. Times are minutes since midnight, Nairobi time.
// Demo screenings are generated around the current time so every case can be tested.
import type { VenueId } from "./data";
import { DEFAULT_SEAT_LAYOUT, parseClock, type SeatLayout } from "./rules";

export type Film = { id: string; title: string; rating: string; runtime: number; demo?: boolean };
export type Screening = {
  id: string;
  venue: VenueId;
  filmId: string;
  screen: number;
  start: number;
  end: number;
  demo?: boolean;
};

export const FILMS: Record<string, Film> = {
  starfall: { id: "starfall", title: "Starfall: Part Two", rating: "16", runtime: 142 },
  savannah: { id: "savannah", title: "Savannah Heist", rating: "16", runtime: 118 },
  lighthouse: { id: "lighthouse", title: "The Last Lighthouse", rating: "PG", runtime: 104 },
  lamu: { id: "lamu", title: "Moonlight Over Lamu", rating: "PG", runtime: 97 },
  paws: { id: "paws", title: "Paws & Whiskers", rating: "GE", runtime: 92 },
  signal: { id: "signal", title: "Dead Signal", rating: "18", runtime: 99 },
  // Demo films: their times move with the clock.
  "demo-rains": { id: "demo-rains", title: "The Long Rains (demo: one screening now)", rating: "PG", runtime: 112, demo: true },
  "demo-matatu": { id: "demo-matatu", title: "Matatu Express (demo: two screens now)", rating: "16", runtime: 101, demo: true },
  "demo-owls": { id: "demo-owls", title: "Night Owls (demo: nothing on now)", rating: "16", runtime: 95, demo: true },
};

export const VENUE_SCREENS: Record<VenueId, number[]> = {
  diamond: [1, 2, 3, 4],
  sky: [1, 2, 3, 4, 5],
};

/** Seat layout per screen. All screens use rows A to J and seats 1 to 14 for now. */
export function seatLayoutFor(_venue: VenueId, _screen: number): SeatLayout {
  return DEFAULT_SEAT_LAYOUT;
}

type Plan = [filmId: string, screen: number, starts: string[]][];

const PLAN: Record<VenueId, Plan> = {
  diamond: [
    ["starfall", 1, ["10:15", "13:30", "16:45", "20:00"]],
    ["starfall", 2, ["19:30"]],
    ["savannah", 2, ["11:00", "14:00", "17:00"]],
    ["savannah", 3, ["21:15"]],
    ["lighthouse", 3, ["10:30", "13:00", "15:45", "18:30"]],
    ["paws", 4, ["10:00", "12:00", "14:15"]],
    ["signal", 4, ["16:30", "19:00", "21:30"]],
  ],
  sky: [
    ["starfall", 1, ["11:00", "14:15", "17:30", "20:45"]],
    ["starfall", 3, ["18:00"]],
    ["savannah", 2, ["10:30", "13:30", "16:30", "19:30"]],
    ["lamu", 3, ["10:45", "13:00", "15:30"]],
    ["lamu", 5, ["21:00"]],
    ["paws", 4, ["10:00", "12:15", "14:30", "16:45"]],
    ["signal", 4, ["21:30"]],
    ["signal", 5, ["18:45", "22:15"]],
    ["lighthouse", 5, ["11:30", "14:00", "16:15"]],
  ],
};

function make(venue: VenueId, filmId: string, screen: number, start: number, demo = false): Screening {
  const film = FILMS[filmId]!;
  return {
    id: `${venue}-${screen}-${filmId}-${demo ? "d" : ""}${start}`,
    venue,
    filmId,
    screen,
    start,
    end: start + film.runtime,
    demo,
  };
}

const STATIC: Record<VenueId, Screening[]> = {
  diamond: [],
  sky: [],
};
for (const venue of ["diamond", "sky"] as const) {
  for (const [filmId, screen, starts] of PLAN[venue]) {
    for (const t of starts) STATIC[venue].push(make(venue, filmId, screen, parseClock(t)!));
  }
}

/**
 * Demo screenings anchored to the current half hour, so within any 30 minutes:
 * - "The Long Rains" has exactly one current screening,
 * - "Matatu Express" has two (screens 2 and 3),
 * - "Night Owls" has none.
 */
function demoScreenings(venue: VenueId, nowMinutes: number): Screening[] {
  const anchor = Math.floor(nowMinutes / 30) * 30;
  return [
    make(venue, "demo-rains", 1, anchor + 10, true),
    make(venue, "demo-rains", 1, anchor + 240, true),
    make(venue, "demo-matatu", 2, anchor - 20, true),
    make(venue, "demo-matatu", 3, anchor + 20, true),
    make(venue, "demo-owls", 4, anchor + 150, true),
    make(venue, "demo-owls", 4, anchor + 300, true),
  ];
}

export function getTodaySchedule(venue: VenueId, nowMinutes: number): Screening[] {
  return [...demoScreenings(venue, nowMinutes), ...STATIC[venue]].sort((a, b) => a.start - b.start);
}

export function findScreening(id: string, nowMinutes: number): Screening | undefined {
  const venue = id.startsWith("diamond-") ? "diamond" : id.startsWith("sky-") ? "sky" : null;
  if (!venue) return undefined;
  return getTodaySchedule(venue, nowMinutes).find((s) => s.id === id);
}
