import { Minus, Plus, Trash2 } from "lucide-react";

import { MAX_QTY_PER_ITEM } from "@/lib/rules";
import { cn } from "@/lib/utils";

const btn =
  "grid size-11 place-items-center text-foreground transition-colors duration-150 hover:bg-elevated disabled:pointer-events-none disabled:opacity-35";

export function QuantityStepper({
  name,
  qty,
  onChange,
  addDisabled = false,
  compact = false,
}: {
  name: string;
  qty: number;
  onChange: (qty: number) => void;
  addDisabled?: boolean;
  compact?: boolean;
}) {
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={addDisabled}
        aria-label={`Add ${name}`}
        className={cn(
          "flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#0a63cc] active:scale-[0.97] disabled:pointer-events-none disabled:bg-elevated disabled:text-muted-foreground",
          compact ? "min-w-11 px-0" : "min-w-[84px]",
        )}
      >
        <Plus aria-hidden className="size-4" />
        {compact ? null : "Add"}
      </button>
    );
  }
  return (
    <div
      role="group"
      aria-label={`Quantity of ${name}`}
      className="flex h-11 items-center overflow-hidden rounded-[10px] border border-border bg-surface-2"
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(qty - 1)}
        aria-label={qty === 1 ? `Remove ${name}` : `One less ${name}`}
      >
        {qty === 1 ? (
          <Trash2 aria-hidden className="size-4" />
        ) : (
          <Minus aria-hidden className="size-4" />
        )}
      </button>
      <span
        className="w-7 text-center font-display text-[15px] font-bold tabular"
        aria-live="polite"
      >
        {qty}
        <span className="sr-only"> in basket</span>
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(qty + 1)}
        disabled={addDisabled || qty >= MAX_QTY_PER_ITEM}
        aria-label={`One more ${name}`}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
