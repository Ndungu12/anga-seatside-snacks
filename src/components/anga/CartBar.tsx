import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatKsh } from "@/lib/data";

export function CartBar({ count, total, closed }: { count: number; total: number; closed: boolean }) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {count} {count === 1 ? "item" : "items"} · placeholder prices
          </p>
          <p className="font-display text-xl font-bold tabular-nums">{formatKsh(total)}</p>
        </div>
        {closed ? (
          <Button size="lg" disabled>
            Ordering closed
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/cart" aria-label={`View cart, ${count} items, ${formatKsh(total)}`}>
              <ShoppingBag /> View cart
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
