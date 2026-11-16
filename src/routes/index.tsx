import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/anga/AppShell";
import { VenuePicker } from "@/components/anga/Notices";
import { toVenueId } from "@/lib/data";

type LandingSearch = { venue?: string | undefined };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LandingSearch => ({
    venue: typeof search["venue"] === "string" ? search["venue"] : undefined,
  }),
  // The venue QR code opens /?venue=sky; skip straight to choosing the show.
  beforeLoad: ({ search }) => {
    const venue = toVenueId(search.venue);
    if (venue) throw redirect({ to: "/show", search: { venue } });
  },
  head: () => ({
    meta: [
      { title: "Anga Seat Order — snacks to your seat" },
      {
        name: "description",
        content: "Order snacks and drinks to your seat at Anga Diamond or Anga Sky. It takes about a minute.",
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

function LandingPage() {
  const { venue } = Route.useSearch();
  const badVenue = Boolean(venue) && !toVenueId(venue);

  return (
    <AppShell>
      <div className="pt-6">
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          Order snacks to your seat.
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">It takes about a minute.</p>
      </div>

      {badVenue ? (
        <div role="alert" className="mt-6 rounded-2xl border-2 border-destructive p-4">
          <p className="font-bold text-destructive">We don't recognise that cinema code</p>
          <p className="mt-1 text-base">Choose your cinema below.</p>
        </div>
      ) : null}

      <h2 className="mb-3 mt-8 text-base font-semibold">Which cinema are you in?</h2>
      <VenuePicker />

      <p className="mt-10 text-center text-base">
        <Link to="/show" search={{ venue: "sky" }} className="text-primary underline underline-offset-4">
          Try a demo
        </Link>
        <span className="block text-sm text-muted-foreground">
          Opens Anga Sky with demo screenings around the current time.
        </span>
      </p>
    </AppShell>
  );
}
