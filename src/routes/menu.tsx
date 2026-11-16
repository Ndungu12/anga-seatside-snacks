import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/anga/AppShell";
import { CartBar } from "@/components/anga/CartBar";
import {
  ClosedNotice,
  LoadingBlock,
  NoSession,
  OpenNotice,
  PlaceholderPriceNote,
} from "@/components/anga/Notices";
import { QuantityStepper } from "@/components/anga/QuantityStepper";
import { CATEGORIES, formatKsh, MENU, summarizeCart, type CategoryId } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/rules";
import {
  setQty,
  useActiveOrder,
  useCart,
  useHydrated,
  useOrderingWindow,
  useSession,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Anga Seat Order" },
      { name: "description", content: "Popcorn, drinks, snacks and combos delivered to your seat." },
      { property: "og:title", content: "Menu — Anga Seat Order" },
      {
        property: "og:description",
        content: "Choose popcorn, drinks, snacks and combos at Anga Cinemas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const cart = useCart();
  const orderWindow = useOrderingWindow(session?.end);
  const activeOrder = useActiveOrder(session);
  const [category, setCategory] = useState<CategoryId>("popcorn");

  if (!hydrated) {
    return (
      <AppShell backTo="/" backLabel="Back to your seat">
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
  const items = MENU.filter((i) => i.category === category);
  const activeLabel = CATEGORIES.find((c) => c.id === category)?.label ?? "";

  return (
    <AppShell
      backTo="/"
      backLabel="Back to your seat"
      footer={<CartBar count={summary.count} total={summary.total} closed={orderWindow.closed} />}
    >
      {activeOrder ? (
        <Link
          to="/order/$orderId"
          params={{ orderId: activeOrder.id }}
          className="mb-4 flex min-h-14 items-center justify-between rounded-2xl border-2 border-primary px-4 py-3"
        >
          <span>
            <span className="block text-sm text-muted-foreground">Your order #{activeOrder.code}</span>
            <span className="font-bold text-primary">{STATUS_LABEL[activeOrder.status]}</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-primary" />
        </Link>
      ) : null}

      <h1 className="font-display text-2xl font-bold">Menu</h1>
      <div className="mt-2 space-y-1">
        {orderWindow.closed ? null : orderWindow.closesAt ? (
          <OpenNotice closesAt={orderWindow.closesAt} />
        ) : null}
        <PlaceholderPriceNote />
      </div>

      {orderWindow.closed ? (
        <div className="mt-4">
          <ClosedNotice end={session.end} cutoff={orderWindow.cutoff} />
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Menu categories"
        className="no-scrollbar sticky top-16 z-10 -mx-4 mt-5 flex gap-2 overflow-x-auto bg-background px-4 py-3"
      >
        {CATEGORIES.map((c) => {
          const selected = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              id={`tab-${c.id}`}
              aria-selected={selected}
              aria-controls="menu-panel"
              onClick={() => setCategory(c.id)}
              className={cn(
                "h-12 shrink-0 rounded-full border-2 px-5 text-base font-semibold",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <ul
        id="menu-panel"
        role="tabpanel"
        aria-labelledby={`tab-${category}`}
        aria-label={activeLabel}
        className="mt-2 space-y-3"
      >
        {items.map((item) => {
          const qty = cart.lines[item.id] ?? 0;
          return (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold leading-snug">{item.name}</h2>
                  <p className="mt-0.5 text-base text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p>
                  <span className="font-display text-xl font-bold tabular-nums">
                    {formatKsh(item.price)}
                  </span>
                  <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                    Placeholder
                  </span>
                </p>
                <QuantityStepper
                  name={item.name}
                  qty={qty}
                  onChange={(n) => setQty(item.id, n)}
                  addDisabled={orderWindow.closed}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
