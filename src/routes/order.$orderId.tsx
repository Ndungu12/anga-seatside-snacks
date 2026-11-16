import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CircleHelp, CircleX } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { LoadingBlock } from "@/components/anga/Notices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKsh, VENUES } from "@/lib/data";
import { canCancel, STATUS_FLOW, STATUS_LABEL, type ActiveStatus } from "@/lib/rules";
import { cancelOrder, setHelpRequested, useHydrated, useOrder } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/order/$orderId")({
  head: () => ({
    meta: [
      { title: "Track your order — Anga Seat Order" },
      { name: "description", content: "See when your snacks are on the way to your seat." },
      { property: "og:title", content: "Track your order — Anga Seat Order" },
      { property: "og:description", content: "Follow your seat order from kiosk to seat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function stepText(status: ActiveStatus, seat: string): string {
  switch (status) {
    case "received":
      return "The kiosk has your order.";
    case "preparing":
      return "Your snacks are being made.";
    case "on_the_way":
      return `An usher is bringing it to seat ${seat}.`;
    case "delivered":
      return "Enjoy the film.";
  }
}

function OrderPage() {
  const { orderId } = Route.useParams();
  const hydrated = useHydrated();
  const order = useOrder(orderId);
  const [helpOpen, setHelpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!hydrated) {
    return (
      <AppShell>
        <LoadingBlock />
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell back={<BackButton><Link to="/menu" aria-label="Back to menu"><BackIcon /></Link></BackButton>}>
        <h1 className="font-display text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-base text-muted-foreground">
          We can't find this order on this phone. Ask an usher if you need help.
        </p>
        <Button asChild variant="accent" className="mt-6">
          <Link to="/menu">Back to menu</Link>
        </Button>
      </AppShell>
    );
  }

  const cancelled = order.status === "cancelled";
  const currentIndex = cancelled ? -1 : STATUS_FLOW.indexOf(order.status as ActiveStatus);
  const cancellable = canCancel(order.status) && order.payment === "paid";

  return (
    <AppShell back={<BackButton><Link to="/menu" aria-label="Back to menu"><BackIcon /></Link></BackButton>}>
      <p className="text-sm text-muted-foreground">Order #{order.code}</p>
      <div role="status" aria-live="polite">
        <h1 className="font-display text-3xl font-bold">
          {cancelled ? "Order cancelled" : STATUS_LABEL[order.status]}
        </h1>
      </div>
      <p className="mt-1 text-base font-semibold">{order.film}</p>
      <p className="text-base text-muted-foreground">
        Seat {order.seat}, screen {order.screen}, {VENUES[order.venue]}
      </p>

      {cancelled ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-lg font-bold">
            <CircleX aria-hidden className="size-5 text-muted-foreground" /> You cancelled this order
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {formatKsh(order.total)} will go back to your M-Pesa (simulated).
          </p>
          <Button asChild variant="accent" className="mt-4 w-full">
            <Link to="/menu">Order something else</Link>
          </Button>
        </div>
      ) : (
        <ol aria-label="Order progress" className="mt-6 space-y-0">
          {STATUS_FLOW.map((status, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            const last = i === STATUS_FLOW.length - 1;
            return (
              <li
                key={status}
                aria-current={current ? "step" : undefined}
                className="relative flex gap-4 pb-6"
              >
                {!last ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5",
                      done ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-display font-bold",
                    done && "border-primary bg-primary text-primary-foreground",
                    current && "border-primary text-primary",
                    !done && !current && "border-border text-muted-foreground",
                  )}
                >
                  {done || (current && last) ? <Check className="size-5" /> : i + 1}
                </span>
                <div className="pt-1.5">
                  <p
                    className={cn(
                      "text-lg font-bold",
                      current ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {STATUS_LABEL[status]}
                    <span className="sr-only">
                      {done ? " (done)" : current ? " (current step)" : " (not yet)"}
                    </span>
                  </p>
                  {current || done ? (
                    <p className="text-base text-muted-foreground">{stepText(status, order.seat)}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section aria-label="Order details" className="mt-2 rounded-2xl border border-border bg-card p-4">
        <ul className="space-y-1">
          {order.lines.map((l) => (
            <li key={l.itemId} className="flex justify-between gap-3 text-base">
              <span>
                {l.qty} × {l.name}
              </span>
              <span className="tabular-nums text-muted-foreground">{formatKsh(l.qty * l.price)}</span>
            </li>
          ))}
        </ul>
        {order.note ? <p className="mt-2 text-base text-muted-foreground">Note: {order.note}</p> : null}
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <span className="font-bold">Paid with M-Pesa</span>
          <span className="font-display text-lg font-bold tabular-nums">{formatKsh(order.total)}</span>
        </div>
        <p className="text-right text-sm text-muted-foreground">Placeholder prices · simulated payment</p>
      </section>

      {!cancelled ? (
        <div className="mt-6 grid gap-3">
          <Button variant="accent" size="lg" onClick={() => setHelpOpen(true)}>
            <CircleHelp /> Need help?
          </Button>

          {order.status !== "delivered" ? (
            <>
              <Button
                variant="destructive-outline"
                size="lg"
                disabled={!cancellable}
                aria-describedby="cancel-hint"
                onClick={() => setCancelOpen(true)}
              >
                Cancel order
              </Button>
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogContent className="border-border bg-popover">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                      {formatKsh(order.total)} will go back to your M-Pesa (simulated).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="h-12 rounded-xl text-base">Keep order</AlertDialogCancel>
                    <AlertDialogAction
                      className="h-12 rounded-xl bg-destructive text-base text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => cancelOrder(order.id)}
                    >
                      Cancel order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p id="cancel-hint" className="text-center text-sm text-muted-foreground">
                {cancellable
                  ? "You can cancel until the kiosk starts preparing your order."
                  : "This order can't be cancelled because the kiosk has started on it."}
              </p>
            </>
          ) : (
            <Button asChild variant="outline" size="lg">
              <Link to="/menu">Order something else</Link>
            </Button>
          )}
        </div>
      ) : null}

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-popover">
          <DialogHeader className="text-left">
            <DialogTitle>Need help?</DialogTitle>
            <DialogDescription className="text-base">
              We can send an usher to seat {order.seat}.
            </DialogDescription>
          </DialogHeader>
          {order.helpRequested ? (
            <p role="status" className="rounded-xl border-2 border-primary bg-primary-soft p-4 text-base">
              An usher is on the way to seat {order.seat}. Please stay in your seat.
            </p>
          ) : (
            <Button size="lg" onClick={() => setHelpRequested(order.id, true)}>
              Ask an usher to come to my seat
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Or visit the kiosk in the lobby and show order #{order.code}.
          </p>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
