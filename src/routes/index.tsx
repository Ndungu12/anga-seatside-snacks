import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  LifeBuoy,
  MessageSquareText,
  QrCode as QrCodeIcon,
} from "lucide-react";

import { AppShell, SectionLabel } from "@/components/anga/AppShell";
import { AngaLogo } from "@/components/anga/Brand";
import { Notice } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { SeatCodeForm } from "@/components/anga/SeatCodeForm";
import { campaignSearch, toVenueId, type CampaignSearch } from "@/lib/data";

type LandingSearch = { venue?: string | undefined } & CampaignSearch;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LandingSearch => ({
    venue: typeof search["venue"] === "string" ? search["venue"] : undefined,
    ...campaignSearch(search),
  }),
  // The venue QR code opens /?venue=sky; skip straight to choosing the show.
  beforeLoad: ({ search }) => {
    const venue = toVenueId(search.venue);
    if (venue) throw redirect({ to: "/show", search: { ...search, venue } });
  },
  head: () => ({
    meta: [
      { title: "ANGA In-Seat — your movie, your moment, your snacks" },
      {
        name: "description",
        content:
          "Order snacks and drinks to your seat at Anga Diamond or Anga Sky. It takes about a minute.",
      },
      { property: "og:title", content: "Anga Seat Order — snacks to your seat" },
      {
        property: "og:description",
        content: "Order snacks to your seat at Anga Cinemas, Nairobi. It takes about a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const DEMO_LINKS: { label: string; href: string; note: string }[] = [
  { label: "Presentation view", href: "/demo", note: "Phone, kiosk and demo controls together" },
  {
    label: "Admissions workstation",
    href: "/admissions",
    note: "Validate tickets and send the ordering SMS",
  },
  { label: "Seat QR signage", href: "/signage", note: "Print a scannable sign for any seat" },
  { label: "Cinema-screen promotion", href: "/promo?c=combo_week", note: "Campaign landing page" },
  { label: "Instagram promotion", href: "/promo?c=popcorn_friday", note: "Social campaign entry" },
  { label: "M-Pesa Mini App", href: "/miniapp", note: "Ordering inside the Mini App (simulated)" },
  { label: "Cashier dashboard", href: "/staff", note: "Orders, fulfilment and notifications" },
];

const STEPS = [
  {
    n: "1",
    title: "Find your seat",
    body: "Scan the code on your seat, open your SMS link, or pick your cinema.",
  },
  {
    n: "2",
    title: "Choose your snacks",
    body: "Popcorn, combos, drinks and hot food, made to order.",
  },
  {
    n: "3",
    title: "Pay with M-Pesa",
    body: "Approve the prompt on your phone. We bring it to your seat.",
  },
];

function LandingPage() {
  const { venue } = Route.useSearch();
  const badVenue = Boolean(venue) && !toVenueId(venue);

  return (
    <AppShell bleed>
      <section className="relative isolate overflow-hidden">
        <img
          src="/images/hero-snacks.jpg"
          alt="Popcorn, nachos and a cold drink on a cinema tray"
          className="absolute inset-0 -z-10 size-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#101114]/30 via-[#101114]/70 to-[#101114]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#101114]/80 to-transparent" />
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-14 sm:pb-16 sm:pt-24">
          <AngaLogo size={64} />
          <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.2em] text-highlight">
            Anga In-Seat · Diamond & Sky
          </p>
          <h1 className="mt-2 max-w-xl font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
            Your movie. Your moment. Your snacks.
          </h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-muted-foreground">
            Order popcorn, drinks and hot food from your seat. Pay with M-Pesa and we'll bring it to
            you, no queue, no missed scenes.
          </p>
          <div className="mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-13 text-[16px] sm:flex-1">
              <Link to="/show">
                Start Ordering <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-13 text-[15px] sm:flex-1">
              <Link to="/booking">I Have a Booking Reference</Link>
            </Button>
          </div>
          {badVenue ? (
            <Notice
              tone="error"
              role="alert"
              title="We don't recognise that cinema code"
              className="mt-6 max-w-md"
            >
              Choose your cinema to continue.
            </Notice>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 pb-24">
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-border bg-surface p-4">
              <span className="grid size-8 place-items-center rounded-full bg-highlight font-display text-sm font-extrabold text-highlight-foreground">
                {s.n}
              </span>
              <p className="mt-3 font-display text-[16px] font-bold">{s.title}</p>
              <p className="mt-1 text-[14px] text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <section
            aria-label="Seat code"
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <SeatCodeForm />
          </section>
          <section aria-label="Help" className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-[18px] font-bold">Need a hand?</h2>
            <ul className="mt-3 space-y-3 text-[14px] text-muted-foreground">
              <li className="flex gap-3">
                <QrCodeIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-link" />
                The QR code is on the back of the seat in front of you, with your seat code under
                it.
              </li>
              <li className="flex gap-3">
                <MessageSquareText aria-hidden className="mt-0.5 size-5 shrink-0 text-link" />
                Booked online? Use the SMS link we send after your ticket is scanned.
              </li>
              <li className="flex gap-3">
                <LifeBuoy aria-hidden className="mt-0.5 size-5 shrink-0 text-link" />
                Tap "Need help?" at any time, or raise your hand for an usher.
              </li>
            </ul>
          </section>
        </div>

        <section aria-label="Demo entry points" className="mt-14">
          <SectionLabel className="mb-3">Prototype · try every entry point</SectionLabel>
          <ul className="grid gap-2 sm:grid-cols-2">
            {DEMO_LINKS.map((d) => (
              <li key={d.href}>
                <a
                  href={d.href}
                  className="group flex min-h-16 items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-150 hover:border-link/50"
                >
                  <span>
                    <span className="block text-[15px] font-semibold">{d.label}</span>
                    <span className="text-[13px] text-muted-foreground">{d.note}</span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-muted-foreground group-hover:text-link"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
