import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { useEffect } from "react";

import { AngaLogo } from "@/components/anga/Brand";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_BY_ID,
  CAMPAIGNS,
  CINEMAS,
  formatKsh,
  MENU_BY_ID,
  campaignSearch,
  type CampaignSearch,
} from "@/lib/data";
import { captureAttribution, useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

type PromoSearch = { c?: string | undefined } & CampaignSearch;

export const Route = createFileRoute("/promo")({
  validateSearch: (search: Record<string, unknown>): PromoSearch => ({
    c: typeof search["c"] === "string" ? search["c"] : undefined,
    ...campaignSearch(search),
  }),
  head: () => ({
    meta: [
      { title: "Anga Cinemas promotion — ANGA In-Seat" },
      { name: "description", content: "Order snacks to your seat at Anga Cinemas." },
    ],
  }),
  component: PromoPage,
});

/** M01/M02: image-led campaign landing. Attribution comes from the URL (utm_*). */
function PromoPage() {
  const search = Route.useSearch();
  const hydrated = useHydrated();
  const campaign = CAMPAIGN_BY_ID[search.c ?? search.utm_campaign ?? ""] ?? CAMPAIGNS[0]!;
  const utm = {
    utm_source: search.utm_source ?? campaign.source,
    utm_medium: search.utm_medium ?? campaign.medium,
    utm_campaign: search.utm_campaign ?? campaign.id,
  };
  const cinema = CINEMAS[campaign.venue];
  const social = campaign.medium === "social";

  // Record the campaign as first-touch attribution even when the link carried only ?c=.
  useEffect(() => {
    if (!hydrated) return;
    captureAttribution("/promo", `?${new URLSearchParams(utm).toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, campaign.id]);

  return (
    <div className="min-h-dvh bg-background">
      <section className="relative isolate min-h-[62dvh] overflow-hidden">
        <img
          src={campaign.image}
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-[#101114]/50 to-[#101114]" />
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-5">
          <span className="flex items-center gap-2.5">
            <AngaLogo size={34} />
            {social ? (
              <span className="leading-tight">
                <span className="block text-[14px] font-bold">angacinemas</span>
                <span className="text-[12px] text-white/70">Sponsored · Instagram</span>
              </span>
            ) : (
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-highlight">
                In-Seat
              </span>
            )}
          </span>
          <span className="rounded-md bg-black/50 px-2 py-1 text-[11px] text-white/80 backdrop-blur">
            Campaign demo
          </span>
        </div>
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-28 sm:pt-40">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-highlight">
            {campaign.eyebrow}
          </p>
          <h1 className="mt-2 max-w-lg font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[44px]">
            {campaign.headline}
          </h1>
          <p className="mt-3 max-w-md text-[16px] leading-relaxed text-muted-foreground">
            {campaign.body}
          </p>
          <span className="mt-4 inline-flex rounded-full bg-highlight px-3 py-1 text-[13px] font-bold text-highlight-foreground">
            {campaign.offer}
          </span>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-5 pb-28">
        <h2 className="font-display text-[18px] font-extrabold">Featured</h2>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {campaign.featured.map((id) => {
            const item = MENU_BY_ID[id]!;
            return (
              <li key={id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <img src={item.image} alt="" className="aspect-square w-full object-cover" />
                <div className="p-2.5">
                  <p className="line-clamp-1 text-[13px] font-semibold">{item.name}</p>
                  <p className="font-display text-[14px] font-extrabold tabular">
                    {formatKsh(item.price)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-3">
          <img src={cinema.image} alt="" className="size-16 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="font-display text-[16px] font-bold">{cinema.name}</p>
            <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <MapPin aria-hidden className="size-3.5" /> {cinema.place}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="h-13 text-[16px]">
            <Link to="/show" search={{ venue: campaign.venue, ...utm }}>
              Order to my seat <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-13">
            <Link to="/booking">I have a booking reference</Link>
          </Button>
        </div>

        <section className="mt-10 rounded-2xl border border-dashed border-border p-4 text-[13px] text-muted-foreground">
          <p className="font-semibold text-foreground">Demo · campaign attribution</p>
          <p className="mt-1">
            source <b className="text-foreground">{utm.utm_source}</b> · medium{" "}
            <b className="text-foreground">{utm.utm_medium}</b> · campaign{" "}
            <b className="text-foreground">{utm.utm_campaign}</b> · venue{" "}
            <b className="text-foreground">{campaign.venue}</b>. These travel with the order to the
            cashier dashboard.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CAMPAIGNS.map((c) => (
              <Link
                key={c.id}
                to="/promo"
                search={{ c: c.id, utm_source: c.source, utm_medium: c.medium, utm_campaign: c.id }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold",
                  c.id === campaign.id ? "bg-highlight text-highlight-foreground" : "bg-surface-2",
                )}
              >
                {c.medium === "social" ? "Instagram" : "Cinema screen"} · {c.id}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
