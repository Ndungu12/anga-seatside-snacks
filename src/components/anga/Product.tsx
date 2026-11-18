import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cartKey, formatKsh, LOW_STOCK, type MenuItem } from "@/lib/data";
import { MAX_QTY_PER_ITEM } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./QuantityStepper";

export function Availability({ left }: { left: number }) {
  if (left === 0)
    return <span className="text-[12px] font-semibold text-destructive">Sold out</span>;
  if (left <= LOW_STOCK)
    return <span className="text-[12px] font-semibold text-warning">Only {left} left</span>;
  return <span className="text-[12px] text-success">Available</span>;
}

/** Catalogue card (C06). Products with options open the detail sheet instead of quick-adding. */
export function ProductCard({
  item,
  qty,
  left,
  closed,
  onOpen,
  onQty,
}: {
  item: MenuItem;
  qty: number;
  left: number;
  closed: boolean;
  onOpen: () => void;
  onQty: (n: number) => void;
}) {
  const soldOut = left === 0;
  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors duration-200 hover:border-[#3d424b]">
      <button
        type="button"
        onClick={onOpen}
        className="relative block text-left"
        aria-label={`View ${item.name}`}
      >
        <div className="aspect-[4/3] overflow-hidden bg-surface-2">
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className={cn(
              "size-full object-cover brightness-[0.92] transition-transform duration-300 group-hover:scale-[1.03]",
              soldOut && "grayscale",
            )}
          />
        </div>
        {item.tag ? (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-highlight backdrop-blur-sm">
            {item.tag}
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col p-3.5">
        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="font-display text-[15px] font-bold leading-snug">{item.name}</h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {item.description}
          </p>
        </button>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="font-display text-[16px] font-extrabold tabular">
              {formatKsh(item.price)}
            </p>
            <Availability left={left} />
          </div>
          {item.options ? (
            <button
              type="button"
              onClick={onOpen}
              disabled={closed || soldOut}
              aria-label={`Choose options for ${item.name}`}
              className="grid size-11 place-items-center rounded-[10px] bg-primary text-white transition-colors duration-150 hover:bg-[#0a63cc] disabled:bg-elevated disabled:text-muted-foreground"
            >
              {qty > 0 ? (
                <span className="font-display text-sm font-extrabold">{qty}</span>
              ) : (
                <Plus className="size-5" />
              )}
            </button>
          ) : (
            <QuantityStepper
              compact
              name={item.name}
              qty={qty}
              onChange={(n) => onQty(Math.min(n, left))}
              addDisabled={closed || qty >= left}
            />
          )}
        </div>
      </div>
    </li>
  );
}

/** Product details (C07): large image, options, quantity, add to basket. */
export function ProductSheet({
  item,
  left,
  closed,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  left: number;
  closed: boolean;
  onClose: () => void;
  onAdd: (key: string, qty: number) => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  useEffect(() => {
    setChoices({});
    setQty(1);
  }, [item?.id]);

  const unit = item
    ? item.price +
      (item.options ?? []).reduce(
        (n, g) => n + (g.choices.find((c) => c.id === choices[g.id]) ?? g.choices[0]!).delta,
        0,
      )
    : 0;
  const max = Math.min(left, MAX_QTY_PER_ITEM);

  return (
    <Sheet open={Boolean(item)} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] max-w-xl overflow-y-auto rounded-t-3xl border-border bg-surface p-0"
      >
        {item ? (
          <>
            <div className="relative aspect-[16/10] overflow-hidden rounded-t-3xl">
              <img src={item.image} alt={item.name} className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
            </div>
            <div className="-mt-6 px-5 pb-6">
              {item.tag ? (
                <span className="relative rounded-md bg-highlight px-2 py-0.5 text-[11px] font-bold text-highlight-foreground">
                  {item.tag}
                </span>
              ) : null}
              <SheetTitle className="relative mt-2 font-display text-[22px] font-extrabold">
                {item.name}
              </SheetTitle>
              <SheetDescription className="mt-1 text-[15px] text-muted-foreground">
                {item.description}
              </SheetDescription>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-display text-xl font-extrabold tabular">
                  {formatKsh(item.price)}
                </span>
                <Availability left={left} />
              </div>

              {(item.options ?? []).map((g) => {
                const selected = choices[g.id] ?? g.choices[0]!.id;
                return (
                  <fieldset key={g.id} className="mt-5">
                    <legend className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {g.label}
                    </legend>
                    <div role="radiogroup" className="mt-2 grid gap-2 sm:grid-cols-2">
                      {g.choices.map((c) => {
                        const on = selected === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setChoices((prev) => ({ ...prev, [g.id]: c.id }))}
                            className={cn(
                              "flex h-12 items-center justify-between rounded-xl border px-4 text-[15px] transition-colors duration-150",
                              on
                                ? "border-highlight bg-highlight-soft"
                                : "border-border bg-surface-2 hover:border-[#454b55]",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className={cn(
                                  "grid size-5 place-items-center rounded-full border",
                                  on
                                    ? "border-highlight bg-highlight text-highlight-foreground"
                                    : "border-input",
                                )}
                              >
                                {on ? <Check className="size-3" strokeWidth={3} /> : null}
                              </span>
                              {c.label}
                            </span>
                            {c.delta ? (
                              <span className="text-sm text-muted-foreground tabular">
                                +{formatKsh(c.delta)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}

              <div className="mt-6 flex items-center gap-3">
                <div
                  role="group"
                  aria-label="Quantity"
                  className="flex h-13 items-center rounded-xl border border-border bg-surface-2"
                >
                  <button
                    type="button"
                    aria-label="One less"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => q - 1)}
                    className="grid size-12 place-items-center disabled:opacity-35"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center font-display text-lg font-extrabold tabular">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="One more"
                    disabled={qty >= max}
                    onClick={() => setQty((q) => q + 1)}
                    className="grid size-12 place-items-center disabled:opacity-35"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <Button
                  size="lg"
                  className="h-13 flex-1"
                  disabled={closed || left === 0}
                  onClick={() => {
                    onAdd(cartKey(item.id, choices), qty);
                    onClose();
                  }}
                >
                  {closed
                    ? "Ordering closed"
                    : left === 0
                      ? "Sold out"
                      : `Add to basket · ${formatKsh(unit * qty)}`}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
