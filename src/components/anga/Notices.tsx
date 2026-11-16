import { Link } from "@tanstack/react-router";
import { Clock, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      <QrCode aria-hidden className="size-14 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-bold">Scan the code on your seat</h1>
      <p className="mt-2 max-w-xs text-base text-muted-foreground">
        Each seat has its own code. Scan it with your phone camera to order snacks to your seat.
      </p>
      <Button asChild variant="accent" className="mt-8">
        <Link to="/" search={{ venue: "sky", screen: "2", seat: "F7", end: "21:45" }}>
          Try a demo seat (Anga Sky, F7)
        </Link>
      </Button>
    </div>
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
