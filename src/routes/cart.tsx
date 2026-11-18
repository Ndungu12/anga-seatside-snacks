import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";

import { AppShell, PageTitle } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { ActionBar } from "@/components/anga/CartBar";
import { ClosedNotice, LoadingBlock, NoSession } from "@/components/anga/Notices";
import { QuantityStepper } from "@/components/anga/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { baseItemId, formatKsh, summarizeCart, VENUES } from "@/lib/data";
import {
  setNote,
  setQty,
  stockLeft,
  useCart,
  useHydrated,
  useOrderingWindow,
  useSession,
  useStock,
} from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your basket — ANGA In-Seat" },
      { name: "description", content: "Review your snacks and pay with M-Pesa." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const cart = useCart();
  const stock = useStock();
  const orderWindow = useOrderingWindow(session?.end);

  const back = (
    <BackButton>
      <Link to="/menu" aria-label="Back to menu">
        <BackIcon />
      </Link>
    </BackButton>
  );

  if (!hydrated) {
    return (
      <AppShell back={back} showContext>
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
  const usedById: Record<string, number> = {};
  for (const l of summary.lines) usedById[l.item.id] = (usedById[l.item.id] ?? 0) + l.qty;

  return (
    <AppShell
      back={back}
      showContext
      footer={
        summary.count > 0 ? (
          <ActionBar>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground">Total</p>
              <p className="font-display text-xl font-extrabold tabular leading-tight">
                {formatKsh(summary.total)}
              </p>
            </div>
            {orderWindow.closed ? (
              <Button disabled size="lg" className="min-w-44">
                Ordering closed
              </Button>
            ) : (
              <Button asChild size="lg" className="min-w-44">
                <Link to="/pay">
                  Checkout <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </ActionBar>
        ) : null
      }
    >
      <PageTitle
        eyebrow={`Seat ${session.seat} · Screen ${session.screen} · ${VENUES[session.venue]}`}
      >
        Your basket
      </PageTitle>

      {orderWindow.closed ? (
        <div className="mt-5">
          <ClosedNotice end={session.end} cutoff={orderWindow.cutoff} />
        </div>
      ) : null}

      {summary.count === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <ShoppingBag aria-hidden className="size-10 text-subtle" />
          <p className="mt-3 font-display text-lg font-bold">Your basket is empty</p>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Popcorn's waiting. Add something you love.
          </p>
          <Button asChild className="mt-5">
            <Link to="/menu">Browse the menu</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {summary.lines.map((l) => {
              const left = stockLeft(stock, baseItemId(l.key));
              const room = left - (usedById[l.item.id] ?? 0);
              return (
                <li
                  key={l.key}
                  className="flex gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <img
                    src={l.item.image}
                    alt=""
                    className="size-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-[15px] font-bold leading-snug">
                          {l.item.name}
                        </p>
                        {l.extras ? <p className="text-[13px] text-link">{l.extras}</p> : null}
                        <p className="text-[12px] text-muted-foreground tabular">
                          {formatKsh(l.unitPrice)} each
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${l.item.name}`}
                        onClick={() => setQty(l.key, 0)}
                        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <QuantityStepper
                        name={l.item.name}
                        qty={l.qty}
                        onChange={(n) => setQty(l.key, n)}
                        addDisabled={orderWindow.closed || room <= 0}
                      />
                      <p className="font-display text-[16px] font-extrabold tabular">
                        {formatKsh(l.lineTotal)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Button asChild variant="secondary" className="mt-4 w-full">
            <Link to="/menu">Continue shopping</Link>
          </Button>

          <div className="mt-6">
            <Label htmlFor="order-note" className="text-sm font-semibold">
              Note for the kiosk{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="order-note"
              value={cart.note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. No ice, extra napkins"
              maxLength={140}
              rows={2}
              className="mt-2 min-h-14 rounded-xl border-border bg-surface-2 text-base"
            />
          </div>

          <dl className="mt-6 space-y-2 rounded-2xl border border-border bg-surface p-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal · {summary.count} items</dt>
              <dd className="tabular">{formatKsh(summary.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Seat delivery</dt>
              <dd className="font-semibold text-success">
                {summary.fee ? formatKsh(summary.fee) : "Free"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-xl font-extrabold tabular">
                {formatKsh(summary.total)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[12px] text-subtle">Demo prices. No real payment is taken.</p>
        </>
      )}
    </AppShell>
  );
}
