import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";

import { CINEMAS, type VenueId } from "@/lib/data";

/** Visual cinema cards (C02). */
export function CinemaCards({ search = {} }: { search?: Record<string, string | undefined> }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(CINEMAS) as VenueId[]).map((id) => {
        const c = CINEMAS[id];
        return (
          <li key={id}>
            <Link
              to="/show"
              search={{ ...search, venue: id }}
              className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors duration-200 hover:border-link/60"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={c.image}
                  alt={`${c.name} cinema`}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101114] via-[#101114]/20 to-transparent" />
                <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                  {c.halls} screens
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 p-4 pt-1">
                <div>
                  <p className="font-display text-lg font-bold">{c.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                    <MapPin aria-hidden className="size-3.5" /> {c.place}, {c.area}
                  </p>
                </div>
                <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white">
                  Select <ArrowRight aria-hidden className="size-4" />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
