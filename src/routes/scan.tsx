import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Wordmark } from "@/components/anga/AppShell";
import { QrGlyph } from "@/components/anga/QrGlyph";
import { Button } from "@/components/ui/button";
import { parseSeatCode } from "@/lib/rules";
import { cn } from "@/lib/utils";

type ScanSearch = { seat?: string | undefined };

export const Route = createFileRoute("/scan")({
  validateSearch: (search: Record<string, unknown>): ScanSearch => ({
    seat: typeof search["seat"] === "string" ? search["seat"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Scan your seat — Anga Seat Order" },
      { name: "description", content: "Simulated camera scan of the QR code on your seat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScanPage,
});

/** Flow 2A start: a simulated camera scan of the seat QR. No camera is used. */
function ScanPage() {
  const { seat } = Route.useSearch();
  const code = seat && parseSeatCode(seat) ? seat.toUpperCase() : "SKY-2-F7";
  const parsed = parseSeatCode(code)!;
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"idle" | "scanning" | "found">("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function scan() {
    if (phase !== "idle") return;
    setPhase("scanning");
    timers.current.push(window.setTimeout(() => setPhase("found"), 1600));
    timers.current.push(
      window.setTimeout(() => navigate({ to: "/q/$code", params: { code } }), 2500),
    );
  }

  const found = phase === "found";
  const corner = cn(
    "absolute size-10 border-[3px] transition-colors duration-300",
    found ? "border-highlight" : "border-foreground/80",
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-4">
        <Wordmark />
        <span className="text-[12px] text-muted-foreground">Camera preview (simulated)</span>
      </header>

      <button
        type="button"
        onClick={scan}
        aria-label={
          found ? "QR code found" : phase === "scanning" ? "Scanning" : "Tap to scan the QR code"
        }
        className="relative mx-3 min-h-[320px] flex-1 overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_50%_35%,#262c38_0%,#141820_55%,#0b0e14_100%)]"
      >
        {/* Out-of-focus seat backs, for a sense of place */}
        <span
          aria-hidden
          className="absolute -left-10 bottom-[-12%] h-[42%] w-[62%] rounded-[40%] bg-[#2a1d26]/70 blur-xl"
        />
        <span
          aria-hidden
          className="absolute -right-8 bottom-[-14%] h-[42%] w-[62%] rounded-[40%] bg-[#2a1d26]/60 blur-xl"
        />

        <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span
            className={cn(
              "block rounded-md bg-[#d9dbe0] p-2 shadow-2xl transition duration-500",
              found ? "" : "blur-[1.5px] brightness-75",
            )}
          >
            <QrGlyph value={`/q/${code}`} size={124} />
            <span className="mt-1 block text-center text-[9px] font-bold tracking-[0.18em] text-[#1a1f29]">
              SCREEN {parsed.screen} · SEAT {parsed.seat}
            </span>
          </span>
        </span>

        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 size-[220px] -translate-x-1/2 -translate-y-1/2"
        >
          <span className={cn(corner, "left-0 top-0 rounded-tl-xl border-b-0 border-r-0")} />
          <span className={cn(corner, "right-0 top-0 rounded-tr-xl border-b-0 border-l-0")} />
          <span className={cn(corner, "bottom-0 left-0 rounded-bl-xl border-r-0 border-t-0")} />
          <span className={cn(corner, "bottom-0 right-0 rounded-br-xl border-l-0 border-t-0")} />
          {phase === "scanning" ? (
            <span className="absolute inset-x-3 top-1/2 h-0.5 rounded-full bg-highlight motion-safe:animate-pulse" />
          ) : null}
          {found ? (
            <span className="absolute -bottom-5 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full bg-highlight text-highlight-foreground">
              <Check className="size-5" strokeWidth={3} />
            </span>
          ) : null}
        </span>
      </button>

      <div
        className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-center"
        role="status"
        aria-live="polite"
      >
        {found ? (
          <>
            <p className="font-display text-lg font-semibold text-highlight">Seat found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Screen {parsed.screen} · Seat {parsed.seat}. Opening the menu…
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-lg font-semibold">Scan the code on your seat</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It's on the back of the seat in front of you.
            </p>
          </>
        )}
        <Button className="mt-5 w-full" size="lg" onClick={scan} disabled={phase !== "idle"}>
          <ScanLine aria-hidden />{" "}
          {phase === "idle" ? "Tap to scan" : found ? "Found" : "Scanning…"}
        </Button>
        <Link
          to="/"
          className="mt-2 inline-flex h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Can't scan? Enter the seat code instead
        </Link>
      </div>
    </div>
  );
}
