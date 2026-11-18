import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Tone = "new" | "active" | "done" | "warn" | "error" | "muted" | "success";

/** Compact status label: dot + text. Colour supports the text, never replaces it. */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold",
        tone === "new" && "bg-highlight text-highlight-foreground",
        tone === "active" && "bg-primary-soft text-link",
        tone === "done" && "bg-elevated text-foreground",
        tone === "success" && "bg-success-soft text-success",
        tone === "warn" && "bg-warning-soft text-warning",
        tone === "error" && "bg-destructive-soft text-destructive",
        tone === "muted" && "bg-surface-2 text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "new" && "bg-highlight-foreground",
          tone === "active" && "bg-link",
          tone === "done" && "bg-foreground",
          tone === "success" && "bg-success",
          tone === "warn" && "bg-warning",
          tone === "error" && "bg-destructive",
          tone === "muted" && "bg-muted-foreground",
        )}
      />
      {children}
    </span>
  );
}
