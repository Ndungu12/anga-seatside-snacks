import { CircleAlert, CircleCheck, Clock, Info } from "lucide-react";
import type { ReactNode } from "react";

import { CinemaCards } from "./CinemaCard";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS = { neutral: Info, attention: Clock, error: CircleAlert, success: CircleCheck };

/** Inline notice: icon + text, tinted background. Status is never colour alone. */
export function Notice({
  tone = "neutral",
  title,
  children,
  role,
  className,
}: {
  tone?: "neutral" | "attention" | "error" | "success";
  title: ReactNode;
  children?: ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      role={role}
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3",
        tone === "attention" && "border-warning/40 bg-warning-soft",
        tone === "error" && "border-destructive/40 bg-destructive-soft",
        tone === "success" && "border-success/40 bg-success-soft",
        tone === "neutral" && "border-border bg-surface-2",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "attention" && "text-warning",
          tone === "error" && "text-destructive",
          tone === "success" && "text-success",
          tone === "neutral" && "text-link",
        )}
      />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{title}</p>
        {children ? <div className="mt-0.5 text-sm text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}

export function ClosedNotice({ end, cutoff }: { end: string; cutoff: number }) {
  return (
    <Notice tone="attention" role="status" title="Ordering has closed for this show">
      Orders close {cutoff} minutes before the film ends at {end}. You can still browse the menu.
    </Notice>
  );
}

export function OpenNotice({ closesAt }: { closesAt: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <Clock aria-hidden className="size-3.5" /> Ordering open until{" "}
      <span className="font-semibold text-foreground tabular">{closesAt}</span>
    </p>
  );
}

export function PlaceholderPriceNote() {
  return <p className="text-[12px] text-subtle">Demo prices in KES</p>;
}

export function NoSession() {
  return (
    <div className="py-10">
      <h1 className="font-display text-[24px] font-extrabold">Let's find your seat first</h1>
      <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
        Tell us what you're watching and where you're sitting, then you can order.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/">Start ordering</Link>
      </Button>
    </div>
  );
}

/** Choose a cinema: visual cards. */
export function VenuePicker({ search }: { search?: Record<string, string | undefined> }) {
  return <CinemaCards search={search ?? {}} />;
}

export function LoadingBlock() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4 py-2">
      <div className="h-6 w-2/5 animate-pulse rounded-md bg-surface-2" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}
