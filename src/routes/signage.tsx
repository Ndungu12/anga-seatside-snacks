import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ExternalLink, Printer } from "lucide-react";
import { useState } from "react";

import { AngaLogo } from "@/components/anga/Brand";
import { QrCode, qrSvgString } from "@/components/anga/Qr";
import { Button } from "@/components/ui/button";
import { VENUES, type VenueId } from "@/lib/data";
import { DEFAULT_SEAT_LAYOUT, seatCode } from "@/lib/rules";
import { VENUE_SCREENS } from "@/lib/schedule";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signage")({
  head: () => ({
    meta: [
      { title: "Seat QR signage — ANGA In-Seat" },
      { name: "description", content: "Design and print the QR sign for any seat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignagePage,
});

const LAYOUTS = {
  card: { label: "Seat-back card · 100 × 150 mm", w: 100, h: 150 },
  sticker: { label: "Armrest sticker · 80 × 80 mm", w: 80, h: 80 },
} as const;
type Layout = keyof typeof LAYOUTS;

const SPEC = [
  "QR at least 60 mm wide with a 4-module white quiet zone.",
  "Dark sign, white QR, matte finish to avoid glare from the screen.",
  "Mount on the seat back in front, at eye level; add a glow-in-the-dark border.",
  "Always print the human-readable seat and code under the QR.",
  "The QR holds the seat only, never ticket or customer data.",
];

/** Q01–Q02: configure, preview, print and download the seat sign. */
function SignagePage() {
  const hydrated = useHydrated();
  const [venue, setVenue] = useState<VenueId>("sky");
  const [screen, setScreen] = useState(2);
  const [row, setRow] = useState("F");
  const [num, setNum] = useState(7);
  const [layout, setLayout] = useState<Layout>("card");
  const seat = `${row}${num}`;
  const code = seatCode(venue, screen, seat);
  const url = hydrated ? `${window.location.origin}/q/${code}` : `/q/${code}`;

  function download() {
    const blob = new Blob([qrSvgString(url)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `anga-seat-qr-${code}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const L = LAYOUTS[layout];
  const select =
    "mt-1 h-11 w-full rounded-[10px] border border-border bg-surface-2 px-3 text-[15px]";

  return (
    <div className="theme-ops min-h-dvh bg-background text-foreground">
      <header className="no-print border-b border-border bg-sidebar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3">
          <div className="mr-auto flex items-center gap-3">
            <AngaLogo size={30} />
            <div>
              <p className="font-display text-[17px] font-extrabold">Seat QR signage</p>
              <p className="text-[12px] text-muted-foreground">
                Every seat gets its own code. Scanning opens the menu for that seat.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="h-11">
            <Link to="/staff">Cashier dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-6 lg:grid-cols-[340px_1fr]">
        <section
          aria-label="Configure"
          className="no-print space-y-4 rounded-2xl border border-border bg-surface p-5"
        >
          <h1 className="font-display text-[18px] font-extrabold">Configure sign</h1>
          <label className="block text-[13px] font-semibold">
            Cinema
            <select
              value={venue}
              onChange={(e) => {
                setVenue(e.target.value as VenueId);
                setScreen(1);
              }}
              className={select}
            >
              {(Object.keys(VENUES) as VenueId[]).map((v) => (
                <option key={v} value={v}>
                  {VENUES[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] font-semibold">
            Screen
            <select
              value={screen}
              onChange={(e) => setScreen(Number(e.target.value))}
              className={select}
            >
              {VENUE_SCREENS[venue].map((s) => (
                <option key={s} value={s}>
                  Screen {s}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px] font-semibold">
              Row
              <select value={row} onChange={(e) => setRow(e.target.value)} className={select}>
                {DEFAULT_SEAT_LAYOUT.rows.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-semibold">
              Seat
              <select
                value={num}
                onChange={(e) => setNum(Number(e.target.value))}
                className={select}
              >
                {Array.from({ length: DEFAULT_SEAT_LAYOUT.seatsPerRow }, (_, i) => i + 1).map(
                  (n) => (
                    <option key={n}>{n}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2.5">
            <p className="text-[12px] text-muted-foreground">Seat code</p>
            <p className="font-display text-[20px] font-extrabold tracking-wide">{code}</p>
            <p className="mt-1 break-all text-[12px] text-subtle">{url}</p>
          </div>
          <fieldset>
            <legend className="text-[13px] font-semibold">Print layout</legend>
            <div className="mt-2 grid gap-2">
              {(Object.keys(LAYOUTS) as Layout[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={layout === k}
                  onClick={() => setLayout(k)}
                  className={cn(
                    "flex h-11 items-center rounded-[10px] border px-3 text-left text-[14px]",
                    layout === k
                      ? "border-highlight bg-highlight-soft"
                      : "border-border bg-surface-2",
                  )}
                >
                  {LAYOUTS[k].label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button variant="secondary" onClick={download}>
              <Download /> SVG
            </Button>
          </div>
          <Button asChild variant="ghost" className="w-full">
            <a href={`/q/${code}`} target="_blank" rel="noreferrer">
              <ExternalLink /> Test this seat (opens guest view)
            </a>
          </Button>
          <ul className="space-y-1.5 border-t border-border pt-4 text-[12px] text-muted-foreground">
            {SPEC.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </section>

        <section
          aria-label="Sign preview"
          className="flex flex-col items-center justify-start gap-3"
        >
          <p className="no-print text-[12px] text-muted-foreground">
            Preview at {L.w} × {L.h} mm · scannable with any phone camera
          </p>
          <figure
            className="print-sign relative overflow-hidden rounded-[18px] bg-[#101114] text-white shadow-[0_0_0_2px_#ffd900,0_30px_60px_-30px_rgba(0,0,0,0.8)]"
            style={{ width: `${L.w * 3.4}px`, height: `${L.h * 3.4}px` }}
          >
            <span aria-hidden className="absolute -left-8 top-5 h-4 w-28 -rotate-45 bg-[#ffd900]" />
            <span
              aria-hidden
              className="absolute -right-8 bottom-6 h-4 w-28 -rotate-45 bg-[#0757b5]"
            />
            {layout === "card" ? (
              <div className="flex h-full flex-col items-center px-6 pb-5 pt-6 text-center">
                <AngaLogo size={46} />
                <p className="mt-2.5 font-display text-[12px] font-extrabold uppercase leading-snug tracking-[0.14em] text-[#ffd900]">
                  Your movie. Your moment.
                  <br />
                  Your snacks.
                </p>
                <div className="mt-3 rounded-xl bg-white p-2">
                  <QrCode value={url} size={176} />
                </div>
                <p className="mt-4 font-display text-[22px] font-extrabold tracking-[0.18em]">
                  SCAN TO ORDER
                </p>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#b7bbc2]">
                  Delivered to your seat
                </p>
                <div className="mt-auto w-full rounded-xl bg-[#0757b5] px-3 py-2">
                  <p className="font-display text-[20px] font-extrabold">
                    Screen {screen} · Seat {seat}
                  </p>
                  <p className="text-[11px] text-white/80">
                    Can't scan? Visit angacinemas.com/order and enter <b>{code}</b>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center gap-4 px-5">
                <div className="shrink-0 rounded-lg bg-white p-1.5">
                  <QrCode value={url} size={150} />
                </div>
                <div className="min-w-0">
                  <AngaLogo size={32} />
                  <p className="mt-2 font-display text-[16px] font-extrabold leading-tight tracking-[0.1em]">
                    SCAN TO ORDER
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd900]">
                    Delivered to your seat
                  </p>
                  <p className="mt-2 font-display text-[18px] font-extrabold">Seat {seat}</p>
                  <p className="text-[11px] text-[#b7bbc2]">
                    Screen {screen} · {code}
                  </p>
                </div>
              </div>
            )}
          </figure>
        </section>
      </main>
      <style>{`@media print { .print-sign { box-shadow:none !important; width:${L.w}mm !important; height:${L.h}mm !important; } main { display:block !important; padding:0 !important } }`}</style>
    </div>
  );
}
