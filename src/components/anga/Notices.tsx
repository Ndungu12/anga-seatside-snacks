import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock, Film } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VENUES, type VenueId } from "@/lib/data";

export function ClosedNotice({ end, cutoff }: { end: string; cutoff: number }) {
  return (
    <div role="status" className="rounded-2xl border-2 border-primary bg-primary-soft p-4">
      <p className="flex items-center gap-2 text-lg font-bold text-primary">
        <Clock aria-hidden className="size-5 shrink-0" />
        Ordering has closed for this show
      </p>
      <p className="mt-1 text-base text-foreground">
        Orders close {cutoff} minutes before the film ends at {end}. You can still look at the
        menu, but you can't check out.
      </p>
    </div>
  );
}

export function OpenNotice({ closesAt }: { closesAt: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock aria-hidden className="size-4 shrink-0" />
      Ordering open until {closesAt}
    </p>
  );
}

export function PlaceholderPriceNote() {
  return (
    <p className="text-sm text-muted-foreground">
      All prices are placeholders for this prototype.
    </p>
  );
}

export function NoSession() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Film aria-hidden className="size-12 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-bold">Let's find your show first</h1>
      <p className="mt-2 max-w-xs text-base text-muted-foreground">
        Tell us what you're watching and where you're sitting, then you can order.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link to="/">Start</Link>
      </Button>
    </div>
  );
}

/** Two large buttons to choose a venue. */
export function VenuePicker() {
  return (
    <nav aria-label="Choose your cinema" className="grid gap-3">
      {(Object.keys(VENUES) as VenueId[]).map((id) => (
        <Link
          key={id}
          to="/show"
          search={{ venue: id }}
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-border bg-card px-5 py-4 hover:border-primary"
        >
          <span>
            <span className="block text-sm text-muted-foreground">I'm at</span>
            <span className="font-display text-2xl font-extrabold text-foreground">
              {VENUES[id]}
            </span>
          </span>
          <ChevronRight aria-hidden className="size-6 text-primary" />
        </Link>
      ))}
    </nav>
  );
}

export function LoadingBlock() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3 py-4">
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-24 rounded-2xl bg-card" />
    </div>
  );
}
