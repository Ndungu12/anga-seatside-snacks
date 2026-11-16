import { useRef, useState, type ReactNode } from "react";

import { VENUES } from "@/lib/data";
import { useHydrated, useSession } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DevMenu } from "./DevMenu";

/**
 * Guest page frame. `back` is a back button (see BackLink); `showContext` adds a
 * sticky row with film, screen and seat under the header.
 */
export function AppShell({
  children,
  back,
  showContext = false,
  wide = false,
  footer,
}: {
  children: ReactNode;
  back?: ReactNode;
  showContext?: boolean;
  wide?: boolean;
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

  const context = showContext && hydrated && session ? session : null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-md items-center gap-1 px-2">
          {back}
          <button
            type="button"
            onClick={onWordmarkTap}
            aria-label="Anga Seat Order"
            className={cn("flex h-12 items-baseline gap-2 rounded-lg px-2", !back && "pl-2")}
          >
            <span className="font-display text-lg font-extrabold tracking-[0.25em] text-primary">
              ANGA
            </span>
            <span className="text-sm text-muted-foreground">Seat Order</span>
          </button>
        </div>
        {context ? (
          <div className="border-t border-border">
            <div
              className="mx-auto flex h-11 max-w-md items-center gap-3 px-4 text-sm"
              aria-label={`${context.film}, ${VENUES[context.venue]}, screen ${context.screen}, seat ${context.seat}`}
            >
              <p className="min-w-0 flex-1 truncate font-semibold text-foreground">{context.film}</p>
              <p className="shrink-0 text-muted-foreground">
                Screen <span className="font-bold text-foreground">{context.screen}</span> · Seat{" "}
                <span className="font-display font-bold text-primary">{context.seat}</span>
              </p>
            </div>
          </div>
        ) : null}
      </header>
      <main className={cn("mx-auto px-4 pb-36 pt-5", wide ? "max-w-3xl" : "max-w-md")}>
        {children}
      </main>
      {footer}
      <DevMenu open={devOpen} onOpenChange={setDevOpen} />
    </div>
  );
}
