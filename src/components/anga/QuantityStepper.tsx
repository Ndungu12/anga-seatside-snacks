import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_QTY_PER_ITEM } from "@/lib/rules";

export function QuantityStepper({
  name,
  qty,
  onChange,
  addDisabled = false,
}: {
  name: string;
  qty: number;
  onChange: (qty: number) => void;
  addDisabled?: boolean;
}) {
  if (qty === 0) {
    return (
      <Button
        variant="accent"
        onClick={() => onChange(1)}
        disabled={addDisabled}
        aria-label={`Add ${name}`}
        className="min-w-28"
      >
        <Plus /> Add
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={`Quantity of ${name}`}
      className="flex items-center rounded-xl border-2 border-primary"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(qty - 1)}
        aria-label={qty === 1 ? `Remove ${name}` : `One less ${name}`}
      >
        {qty === 1 ? <Trash2 /> : <Minus />}
      </Button>
      <span className="w-8 text-center font-display text-lg font-bold tabular-nums" aria-live="polite">
        {qty}
        <span className="sr-only"> in cart</span>
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(qty + 1)}
        disabled={addDisabled || qty >= MAX_QTY_PER_ITEM}
        aria-label={`One more ${name}`}
      >
        <Plus />
      </Button>
    </div>
  );
}
