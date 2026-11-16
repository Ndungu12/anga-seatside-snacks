import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { AppShell } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { ClosedNotice, LoadingBlock, NoSession } from "@/components/anga/Notices";
import { QuantityStepper } from "@/components/anga/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatKsh, summarizeCart, VENUES } from "@/lib/data";
import {
  setNote,
  setQty,
  useCart,
  useHydrated,
  useOrderingWindow,
  useSession,
} from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Anga Seat Order" },
      { name: "description", content: "Review your snacks and pay with M-Pesa." },
      { property: "og:title", content: "Your cart — Anga Seat Order" },
      { property: "og:description", content: "Review your order before paying with M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const cart = useCart();
  const orderWindow = useOrderingWindow(session?.end);

  if (!hydrated) {
    return (
      <AppShell back={<BackButton><Link to="/menu" aria-label="Back to menu"><BackIcon /></Link></BackButton>} showContext>
        <LoadingBlock />
      </AppShell>
    );
  }
  if (!session) {
    return (
      <AppShell>
        <NoSession />
      </AppShell>
    );
  }

  const summary = summarizeCart(cart.lines);

  return (
    <AppShell back={<BackButton><Link to="/menu" aria-label="Back to menu"><BackIcon /></Link></BackButton>} showContext>
      <h1 className="font-display text-2xl font-bold">Your cart</h1>
      <p className="mt-2 flex items-center gap-2 text-base text-muted-foreground">
        <MapPin aria-hidden className="size-4 shrink-0" />
        Delivering to seat {session.seat}, screen {session.screen}, {VENUES[session.venue]}
      </p>

      {orderWindow.closed ? (
        <div className="mt-4">
          <ClosedNotice end={session.end} cutoff={orderWindow.cutoff} />
        </div>
      ) : null}

      {summary.count === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-lg">Your cart is empty.</p>
          <Button asChild variant="accent" className="mt-4">
            <Link to="/menu">Browse the menu</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
            {summary.lines.map(({ item, qty, lineTotal }) => (
              <li key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-bold leading-snug">{item.name}</p>
                  <p className="shrink-0 font-display text-lg font-bold tabular-nums">
                    {formatKsh(lineTotal)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{formatKsh(item.price)} each</p>
                  <QuantityStepper
                    name={item.name}
                    qty={qty}
                    onChange={(n) => setQty(item.id, n)}
                    addDisabled={orderWindow.closed}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Label htmlFor="order-note" className="text-base">
              Note for the kiosk (optional)
            </Label>
            <Textarea
              id="order-note"
              value={cart.note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="No ice"
              maxLength={140}
              rows={2}
              className="mt-2 min-h-14 rounded-xl border-2 text-base"
            />
          </div>

          <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
            <p className="text-lg">Total</p>
            <p className="font-display text-3xl font-extrabold tabular-nums">
              {formatKsh(summary.total)}
            </p>
          </div>
          <p className="text-right text-sm text-muted-foreground">Placeholder prices</p>

          {orderWindow.closed ? (
            <Button size="lg" className="mt-6 w-full text-lg" disabled>
              Ordering has closed
            </Button>
          ) : (
            <Button asChild size="lg" className="mt-6 w-full text-lg">
              <Link to="/pay">Pay with M-Pesa</Link>
            </Button>
          )}
        </>
      )}
    </AppShell>
  );
}
