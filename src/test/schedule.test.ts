import { describe, expect, it } from "vitest";

import { findCurrentScreenings } from "@/lib/rules";
import { findScreening, getTodaySchedule, VENUE_SCREENS } from "@/lib/schedule";

const VENUES = ["diamond", "sky"] as const;

function current(venue: (typeof VENUES)[number], filmId: string, now: number) {
  return findCurrentScreenings(
    getTodaySchedule(venue, now).filter((s) => s.filmId === filmId),
    now,
  );
}

describe("demo schedule", () => {
  it("always has one, two and zero current screenings for the three demo films", () => {
    for (const venue of VENUES) {
      for (let now = 0; now < 1440; now++) {
        expect(current(venue, "demo-rains", now)).toHaveLength(1);
        expect(current(venue, "demo-matatu", now)).toHaveLength(2);
        expect(current(venue, "demo-owls", now)).toHaveLength(0);
      }
    }
  });

  it("gives each real film several screenings across the day", () => {
    for (const venue of VENUES) {
      const real = getTodaySchedule(venue, 600).filter((s) => !s.demo);
      const perFilm = new Map<string, number>();
      for (const s of real) perFilm.set(s.filmId, (perFilm.get(s.filmId) ?? 0) + 1);
      for (const count of perFilm.values()) expect(count).toBeGreaterThanOrEqual(3);
      for (const s of real) expect(VENUE_SCREENS[venue]).toContain(s.screen);
    }
  });
});

describe("findScreening", () => {
  it("finds a real screening by id", () => {
    const s = getTodaySchedule("diamond", 600).find((x) => !x.demo)!;
    expect(findScreening(s.id, 600)).toEqual(s);
  });

  it("still finds a demo screening after the clock moves past the half hour", () => {
    const picked = current("sky", "demo-rains", 20 * 60 + 29)[0]!;
    expect(findScreening(picked.id, 20 * 60 + 31)).toEqual(picked);
    expect(findScreening(picked.id, 22 * 60)).toEqual(picked);
  });

  it("rejects unknown or malformed ids", () => {
    expect(findScreening("sky.2.nope.600", 600)).toBeUndefined();
    expect(findScreening("mars.2.starfall.600", 600)).toBeUndefined();
    expect(findScreening("sky.1.starfall.601", 600)).toBeUndefined();
    expect(findScreening("sky.9.demo-rains.600", 600)).toBeUndefined();
    expect(findScreening("garbage", 600)).toBeUndefined();
  });
});
