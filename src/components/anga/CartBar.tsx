import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";

import { formatKsh } from "@/lib/data";

/** Persistent basket bar on the menu. */
export function CartBar({
  count,
  total,
  closed,
}: {
  count: number;
  total: number;
  closed: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 [background:linear-gradient(to_top,var(--background)_60%,transparent)]">
      <div className="mx-auto max-w-3xl">
        {closed ? (
          <div className="flex h-14 items-center justify-between rounded-2xl bg-elevated px-5 text-[15px] text-muted-foreground">
            Ordering closed for this show <span className="tabular">{formatKsh(total)}</span>
          </div>
        ) : (
          <Link
            to="/cart"
            aria-label={`View basket, ${count} items, ${formatKsh(total)}`}
            className="flex h-14 items-center gap-3 rounded-2xl bg-primary px-4 text-white shadow-[0_12px_32px_-12px_rgba(7,87,181,0.8)] transition-colors duration-150 hover:bg-[#0a63cc]"
          >
            <span className="grid size-8 place-items-center rounded-full bg-highlight font-display text-sm font-extrabold text-highlight-foreground tabular">
              {count}
            </span>
            <span className="flex-1 text-[15px] font-semibold">View basket</span>
            <span className="font-display text-[16px] font-bold tabular">{formatKsh(total)}</span>
            <ShoppingBag aria-hidden className="size-5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/** Sticky bottom action bar for single primary actions. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">{children}</div>
    </div>
  );
}
