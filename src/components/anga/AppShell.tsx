import { useRef, useState, type ReactNode } from "react";

import { VENUES } from "@/lib/data";
import { useHydrated, useSession } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AngaLogo, BrandLockup } from "./Brand";
import { DevMenu } from "./DevMenu";
import { HelpButton } from "./HelpSheet";

/** Logo lockup used across guest and staff screens. */
export function Wordmark({ sub = "In-Seat" }: { sub?: string }) {
  return <BrandLockup sub={sub} size={28} />;
}

/**
 * Guest page frame: header with the official logo, an optional sticky line with film,
 * screen and seat, and Help one tap away. Tap the logo three times for the demo menu.
 */
export function AppShell({
  children,
  back,
  showContext = false,
  wide = false,
  footer,
  help = true,
  bleed = false,
}: {
  children: ReactNode;
  back?: ReactNode;
  showContext?: boolean;
  wide?: boolean;
  footer?: ReactNode;
  help?: boolean;
  /** Content runs edge to edge (hero pages) */
  bleed?: boolean;
}) {
  const [devOpen, setDevOpen] = useState(false);
  const taps = useRef<number[]>([]);
  const hydrated = useHydrated();
  const session = useSession();

  function onLogoTap() {
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
      <header className="sticky top-0 z-20 border-b border-border/70 bg-[#0c0d10]/90 backdrop-blur-md">
        <div
          className={cn(
            "mx-auto flex h-14 items-center gap-1 px-2",
            wide ? "max-w-5xl" : "max-w-3xl",
          )}
        >
          {back ?? <span className="w-2" />}
          <button
            type="button"
            onClick={onLogoTap}
            aria-label="Anga In-Seat"
            className="flex h-11 items-center rounded-lg px-1.5"
          >
            <span className="flex items-center gap-2">
              <AngaLogo size={26} />
              <span className="flex flex-col items-start leading-none">
                <span className="font-display text-[14px] font-extrabold tracking-[0.18em]">
                  ANGA
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-highlight">
                  In-Seat
                </span>
              </span>
            </span>
          </button>
          <div className="ml-auto">{help ? <HelpButton /> : null}</div>
        </div>
        {context ? (
          <div className="border-t border-border/70">
            <div
              className={cn(
                "mx-auto flex h-11 items-center gap-3 px-4 text-[13px]",
                wide ? "max-w-5xl" : "max-w-3xl",
              )}
              aria-label={`${context.film}, ${VENUES[context.venue]}, screen ${context.screen}, seat ${context.seat}`}
            >
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                <span className="font-semibold text-foreground">{context.film}</span>
                <span aria-hidden> · </span>
                {VENUES[context.venue]} · Screen {context.screen}
              </span>
              <span className="flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-highlight px-2 font-display text-[13px] font-extrabold text-highlight-foreground">
                Seat {context.seat}
              </span>
            </div>
          </div>
        ) : null}
      </header>
      <main
        className={cn(
          bleed ? "" : "mx-auto px-4 pb-36 pt-6",
          !bleed && (wide ? "max-w-5xl" : "max-w-3xl"),
        )}
      >
        {children}
      </main>
      {footer}
      <DevMenu open={devOpen} onOpenChange={setDevOpen} />
    </div>
  );
}

/** Small uppercase label above groups of content. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Page title: Manrope, confident but not oversized. */
export function PageTitle({ children, eyebrow }: { children: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div>
      {eyebrow ? (
        <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h1 className="font-display text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
        {children}
      </h1>
    </div>
  );
}
