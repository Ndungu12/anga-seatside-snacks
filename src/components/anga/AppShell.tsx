import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { VENUES } from "@/lib/data";
import { useHydrated, useSession } from "@/lib/store";
import { DevMenu } from "./DevMenu";

type BackTo = "/" | "/menu" | "/cart";

export function AppShell({
  children,
  backTo,
  backLabel,
  showSeat = true,
  footer,
}: {
  children: ReactNode;
  backTo?: BackTo;
  backLabel?: string;
  showSeat?: boolean;
  footer?: ReactNode;
}) {
  const [devOpen, setDevOpen] = useState(false);
  const taps = useRef<number[]>([]);
  const hydrated = useHydrated();
  const session = useSession();

  function onWordmarkTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      setDevOpen(true);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-md items-center gap-1 px-2">
          {backTo ? (
            <Button asChild variant="ghost" size="icon">
              <Link to={backTo} aria-label={backLabel ?? "Go back"}>
                <ArrowLeft />
              </Link>
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onWordmarkTap}
            aria-label="Anga Seat Order"
            className="flex h-12 items-baseline gap-2 rounded-lg px-2"
          >
            <span className="font-display text-lg font-extrabold tracking-[0.25em] text-primary">
              ANGA
            </span>
            <span className="text-sm text-muted-foreground">Seat Order</span>
          </button>
          {showSeat && hydrated && session ? (
            <p
              className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm"
              aria-label={`${VENUES[session.venue]}, screen ${session.screen}, seat ${session.seat}`}
            >
              <span className="text-muted-foreground">Seat </span>
              <span className="font-display font-bold text-foreground">{session.seat}</span>
            </p>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pb-36 pt-5">{children}</main>
      {footer}
      <DevMenu open={devOpen} onOpenChange={setDevOpen} />
    </div>
  );
}
