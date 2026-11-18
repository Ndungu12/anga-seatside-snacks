import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell, SectionLabel } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { CartBar } from "@/components/anga/CartBar";
import {
  ClosedNotice,
  LoadingBlock,
  NoSession,
  OpenNotice,
  PlaceholderPriceNote,
} from "@/components/anga/Notices";
import { ProductCard, ProductSheet } from "@/components/anga/Product";
import {
  CATEGORIES,
  formatKsh,
  MENU,
  MENU_BY_ID,
  RECOMMENDED_IDS,
  summarizeCart,
  type CategoryId,
  type MenuItem,
} from "@/lib/data";
import { STATUS_LABEL } from "@/lib/rules";
import {
  cartStore,
  setQty,
  stockLeft,
  useActiveOrder,
  useCart,
  useHydrated,
  useOrderingWindow,
  useSession,
  useStock,
  type Session,
} from "@/lib/store";
import { cn } from "@/lib/utils";

/** Back goes to wherever the guest came in, so they can correct the show or seat. */
function backLink(session: Session) {
  if (session.linkToken) {
    return (
      <Link to="/t/$token" params={{ token: session.linkToken }} aria-label="Back to your booking">
        <BackIcon />
      </Link>
    );
  }
  if (session.entryPoint === "booking_ref" || session.entryPoint === "seat_qr") {
    return (
      <Link to="/" aria-label="Back to start">
        <BackIcon />
      </Link>
    );
  }
  return (
    <Link to="/seat" search={{ screening: session.screeningId }} aria-label="Change seat">
      <BackIcon />
    </Link>
  );
}

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — ANGA In-Seat" },
      {
        name: "description",
        content: "Popcorn, combos, drinks and hot food delivered to your cinema seat.",
      },
      { property: "og:title", content: "Menu — ANGA In-Seat" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MenuPage,
});

type Tab = "all" | CategoryId;

function MenuPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const cart = useCart();
  const stock = useStock();
  const orderWindow = useOrderingWindow(session?.end);
  const activeOrder = useActiveOrder(session);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<MenuItem | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(null), 2200);
    return () => window.clearTimeout(t);
  }, [added]);

  const qtyByItem = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [key, q] of Object.entries(cart.lines)) {
      const id = key.split("~")[0]!;
      out[id] = (out[id] ?? 0) + q;
    }
    return out;
  }, [cart.lines]);

  if (!hydrated) {
    return (
      <AppShell wide>
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
  const q = query.trim().toLowerCase();
  const items = MENU.filter(
    (i) =>
      (tab === "all" || i.category === tab) &&
      (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)),
  );
  const recommended = RECOMMENDED_IDS.map((id) => MENU_BY_ID[id]!).filter(
    (i) => stockLeft(stock, i.id) > 0,
  );
  const hasCombo = Object.keys(cart.lines).some((k) => k.startsWith("cmb-"));
  const hasPopcornAndDrink =
    Object.keys(cart.lines).some((k) => k.startsWith("pop-")) &&
    Object.keys(cart.lines).some((k) => k.startsWith("drk-"));

  function addKey(key: string, n: number) {
    const id = key.split("~")[0]!;
    const current = cartStore.get().lines[key] ?? 0;
    const room = stockLeft(stock, id) - (qtyByItem[id] ?? 0);
    setQty(key, current + Math.max(0, Math.min(n, room)));
    setAdded(MENU_BY_ID[id]?.name ?? "Item");
  }

  const grouped = tab === "all" && !q;

  return (
    <AppShell
      wide
      showContext
      back={<BackButton>{backLink(session)}</BackButton>}
      footer={<CartBar count={summary.count} total={summary.total} closed={orderWindow.closed} />}
    >
      {activeOrder ? (
        <Link
          to="/order/$orderId"
          params={{ orderId: activeOrder.id }}
          className="mb-5 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-link/40 bg-primary-soft px-4 py-3"
        >
          <span className="text-[14px]">
            <span className="text-muted-foreground">Order {activeOrder.number} · </span>
            <span className="font-semibold text-link">{STATUS_LABEL[activeOrder.status]}</span>
          </span>
          <span className="flex items-center text-[14px] font-semibold text-link">
            Track <ChevronRight aria-hidden className="size-4" />
          </span>
        </Link>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            {session.customerName ? `Hi ${session.customerName.split(" ")[0]}, ` : ""}delivering to
            seat <span className="font-semibold text-highlight">{session.seat}</span>
          </p>
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">
            What are you craving?
          </h1>
        </div>
        <div className="text-right">
          {orderWindow.closed ? null : orderWindow.closesAt ? (
            <OpenNotice closesAt={orderWindow.closesAt} />
          ) : null}
          <PlaceholderPriceNote />
        </div>
      </div>

      {orderWindow.closed ? (
        <div className="mt-5">
          <ClosedNotice end={session.end} cutoff={orderWindow.cutoff} />
        </div>
      ) : null}

      {session.entryPoint === "seat_qr" ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Seat {session.seat} from the code on your seat.{" "}
          <Link to="/show" search={{ venue: session.venue }} className="font-semibold text-link">
            Not your seat?
          </Link>
        </p>
      ) : session.bookingRef ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Booking {session.bookingRef} · ticket {session.ticketRef}
        </p>
      ) : null}

      <div className="relative mt-5">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          aria-label="Search the menu"
          placeholder="Search popcorn, drinks, meals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-10 text-[15px] placeholder:text-subtle focus:border-link focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Menu categories"
        className="no-scrollbar sticky top-[101px] z-10 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur"
      >
        {([{ id: "all", label: "All" }, ...CATEGORIES] as { id: Tab; label: string }[]).map((c) => {
          const selected = c.id === tab;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(c.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors duration-150",
                selected
                  ? "bg-highlight text-highlight-foreground"
                  : "border border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {grouped && recommended.length ? (
        <section aria-label="Recommended" className="mt-4">
          <SectionLabel className="mb-3">Recommended for you</SectionLabel>
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {recommended.map((i) => (
              <li key={i.id} className="w-[240px] shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group relative block aspect-[5/4] w-full overflow-hidden rounded-2xl text-left"
                >
                  <img
                    src={i.image}
                    alt=""
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  {i.tag ? (
                    <span className="absolute left-2.5 top-2.5 rounded-md bg-highlight px-1.5 py-0.5 text-[11px] font-bold text-highlight-foreground">
                      {i.tag}
                    </span>
                  ) : null}
                  <span className="absolute inset-x-3 bottom-3">
                    <span className="block font-display text-[15px] font-bold text-white">
                      {i.name}
                    </span>
                    <span className="text-[13px] font-semibold text-white/80 tabular">
                      {formatKsh(i.price)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {grouped && !hasCombo && hasPopcornAndDrink ? (
        <button
          type="button"
          onClick={() => setOpen(MENU_BY_ID["cmb-solo"]!)}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-highlight/40 bg-highlight-soft p-3 text-left"
        >
          <img
            src={MENU_BY_ID["cmb-solo"]!.image}
            alt=""
            className="size-14 rounded-xl object-cover"
          />
          <span className="flex-1">
            <span className="block text-[14px] font-semibold">
              Popcorn and a drink? Make it a combo.
            </span>
            <span className="text-[13px] text-muted-foreground">
              Solo Movie Combo for {formatKsh(MENU_BY_ID["cmb-solo"]!.price)}
            </span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-highlight" />
        </button>
      ) : null}

      {grouped ? (
        CATEGORIES.map((c) => {
          const list = MENU.filter((i) => i.category === c.id);
          return (
            <section key={c.id} aria-label={c.label} className="mt-8">
              <h2 className="mb-3 font-display text-[20px] font-extrabold">{c.label}</h2>
              <ProductGrid
                items={list}
                cart={qtyByItem}
                stock={stock}
                closed={orderWindow.closed}
                onOpen={setOpen}
                onQty={(item, n) => {
                  setQty(item.id, n);
                  if (n > (qtyByItem[item.id] ?? 0)) setAdded(item.name);
                }}
              />
            </section>
          );
        })
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-[15px] text-muted-foreground">
          Nothing matches "{query}".
        </p>
      ) : (
        <div className="mt-4">
          <ProductGrid
            items={items}
            cart={qtyByItem}
            stock={stock}
            closed={orderWindow.closed}
            onOpen={setOpen}
            onQty={(item, n) => {
              setQty(item.id, n);
              if (n > (qtyByItem[item.id] ?? 0)) setAdded(item.name);
            }}
          />
        </div>
      )}

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto w-fit rounded-full bg-success px-4 py-2 text-[14px] font-semibold text-white shadow-lg transition-all duration-200",
          added ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        {added ? `${added} added to your basket` : ""}
      </p>

      <ProductSheet
        item={open}
        left={open ? Math.max(0, stockLeft(stock, open.id) - (qtyByItem[open.id] ?? 0)) : 0}
        closed={orderWindow.closed}
        onClose={() => setOpen(null)}
        onAdd={addKey}
      />
    </AppShell>
  );
}

function ProductGrid({
  items,
  cart,
  stock,
  closed,
  onOpen,
  onQty,
}: {
  items: MenuItem[];
  cart: Record<string, number>;
  stock: Record<string, number>;
  closed: boolean;
  onOpen: (i: MenuItem) => void;
  onQty: (i: MenuItem, n: number) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          qty={cart[item.id] ?? 0}
          left={stockLeft(stock, item.id)}
          closed={closed}
          onOpen={() => onOpen(item)}
          onQty={(n) => onQty(item, n)}
        />
      ))}
    </ul>
  );
}
