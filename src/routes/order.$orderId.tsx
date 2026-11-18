import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { AppShell, PageTitle, SectionLabel } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { HelpSheetView } from "@/components/anga/HelpSheet";
import { LoadingBlock, Notice } from "@/components/anga/Notices";
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
import { formatKsh, VENUES } from "@/lib/data";
import {
  canCancel,
  GUEST_TRACK,
  guestStepIndex,
  paymentFailureMessage,
  STATUS_LABEL,
} from "@/lib/rules";
import { cancelOrderByGuest, useHydrated, useOrder } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/order/$orderId")({
  head: () => ({
    meta: [
      { title: "Track your order — ANGA In-Seat" },
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

function OrderPage() {
  const { orderId } = Route.useParams();
  const hydrated = useHydrated();
  const order = useOrder(orderId);
  const [helpOpen, setHelpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const back = (
    <BackButton>
      <Link to="/menu" aria-label="Back to menu">
        <BackIcon />
      </Link>
    </BackButton>
  );

  if (!hydrated) {
    return (
      <AppShell>
        <LoadingBlock />
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell back={back}>
        <PageTitle>Order not found</PageTitle>
        <p className="mt-2 text-[15px] text-muted-foreground">
          We can't find this order on this phone. Ask an usher if you need help.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link to="/menu">Back to menu</Link>
        </Button>
      </AppShell>
    );
  }

  const step = guestStepIndex(order.status);
  const inFlow = step >= 0;
  const cancellable = canCancel(order.status) && order.status !== "pending_payment";
  const delivered = order.status === "delivered";
  const current = inFlow ? GUEST_TRACK[step]! : null;
  const headline =
    order.status === "out_for_delivery"
      ? "On its way to your seat"
      : current
        ? current.label
        : STATUS_LABEL[order.status];

  return (
    <AppShell help={false} back={back}>
      <section className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="relative p-5" role="status" aria-live="polite">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(7_87_181_/_0.35),transparent)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] text-muted-foreground">
                Order{" "}
                <span className="font-display font-bold tracking-wide text-foreground">
                  {order.number}
                </span>
              </p>
              <h1 className="mt-1 font-display text-[26px] font-extrabold leading-tight">
                {headline}
              </h1>
              {current ? (
                <p className="mt-1 text-[14px] text-muted-foreground">{current.text}</p>
              ) : null}
            </div>
            <div className="shrink-0 rounded-xl bg-highlight px-3 py-2 text-center text-highlight-foreground">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]">Seat</p>
              <p className="font-display text-[24px] font-extrabold leading-none">{order.seat}</p>
            </div>
          </div>
          <p className="relative mt-3 text-[13px] text-muted-foreground">
            {order.film} · Screen {order.screen} · {VENUES[order.venue]}
          </p>
        </div>

        {inFlow ? (
          <div className="border-t border-border px-5 py-5">
            <div className="flex items-center" aria-hidden>
              {GUEST_TRACK.map((s, i) => (
                <div key={s.id} className="flex flex-1 items-center last:flex-none">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-300",
                      i < step || (i === step && delivered)
                        ? "bg-success text-white"
                        : i === step
                          ? "bg-highlight text-highlight-foreground"
                          : "bg-elevated text-subtle",
                    )}
                  >
                    {i < step || (i === step && delivered) ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      <span className="text-[13px] font-bold">{i + 1}</span>
                    )}
                  </span>
                  {i < GUEST_TRACK.length - 1 ? (
                    <span
                      className={cn(
                        "mx-1 h-1 flex-1 rounded-full transition-colors duration-300",
                        i < step ? "bg-success" : "bg-elevated",
                      )}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <ol aria-label="Order progress" className="mt-3 grid grid-cols-4 gap-1 text-[12px]">
              {GUEST_TRACK.map((s, i) => {
                const at = [...order.history]
                  .reverse()
                  .find((h) => (s.statuses as string[]).includes(h.status))?.at;
                return (
                  <li
                    key={s.id}
                    aria-current={i === step ? "step" : undefined}
                    className={cn(i <= step ? "text-foreground" : "text-subtle")}
                  >
                    <span className="font-semibold leading-tight">{s.label}</span>
                    <span className="sr-only">
                      {i < step ? " (done)" : i === step ? " (current step)" : " (not yet)"}
                    </span>
                    {at && i <= step ? (
                      <span className="block text-muted-foreground tabular">{clock(at)}</span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </section>

      {order.status === "pending_payment" ? (
        <Notice
          tone="attention"
          role="status"
          title="Waiting for M-Pesa to confirm"
          className="mt-5"
        >
          As soon as M-Pesa confirms your payment, the kiosk gets the order. You can leave this
          page.
        </Notice>
      ) : order.status === "payment_failed" ? (
        <div className="mt-5">
          <Notice tone="error" role="alert" title="We couldn't complete your payment">
            {paymentFailureMessage(order.attempts.at(-1)?.outcome ?? "insufficient_funds")}
          </Notice>
          <Button asChild className="mt-4 w-full">
            <Link to="/pay">Try paying again</Link>
          </Button>
        </div>
      ) : order.status === "cancelled" ? (
        <Notice tone="neutral" title="This order was cancelled" className="mt-5">
          Nothing was charged.
        </Notice>
      ) : order.status === "refund_pending" ? (
        <Notice
          tone="attention"
          role="status"
          title="Order cancelled, refund on the way"
          className="mt-5"
        >
          {formatKsh(order.total)} will go back to your M-Pesa ({order.receipt}).
        </Notice>
      ) : order.status === "refunded" ? (
        <Notice tone="success" title="Refunded" className="mt-5">
          {formatKsh(order.total)} was returned to your M-Pesa.
        </Notice>
      ) : null}

      <section
        aria-label="Order details"
        className="mt-5 rounded-2xl border border-border bg-surface p-4"
      >
        <SectionLabel className="mb-3">Your order</SectionLabel>
        <ul className="space-y-2.5">
          {order.lines.map((l) => (
            <li key={l.itemId} className="flex items-center gap-3 text-[14px]">
              {l.image ? (
                <img src={l.image} alt="" className="size-10 rounded-lg object-cover" />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="text-muted-foreground tabular">{l.qty}× </span>
                {l.name}
                {l.extras ? <span className="block text-[12px] text-link">{l.extras}</span> : null}
              </span>
              <span className="tabular text-muted-foreground">{formatKsh(l.qty * l.price)}</span>
            </li>
          ))}
        </ul>
        {order.note ? (
          <p className="mt-3 text-[13px] text-muted-foreground">Note: {order.note}</p>
        ) : null}
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-[14px]">{order.paidAt ? "Paid with M-Pesa" : "Total"}</span>
          <span className="font-display text-lg font-extrabold tabular">
            {formatKsh(order.total)}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-subtle">
          {order.receipt ? `Receipt ${order.receipt} · ` : ""}
          {order.bookingRef ? `Booking ${order.bookingRef} · ` : ""}simulated payment
        </p>
      </section>

      <div className="mt-6 grid gap-3">
        <Button variant="secondary" size="lg" onClick={() => setHelpOpen(true)}>
          Need help?
        </Button>
        {delivered || order.status === "refunded" || order.status === "cancelled" ? (
          <Button asChild size="lg">
            <Link to="/menu">Order something else</Link>
          </Button>
        ) : inFlow ? (
          <>
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive-soft disabled:text-muted-foreground"
              disabled={!cancellable}
              aria-describedby="cancel-hint"
              onClick={() => setCancelOpen(true)}
            >
              Cancel order
            </Button>
            <p id="cancel-hint" className="-mt-1 text-center text-[13px] text-muted-foreground">
              {cancellable
                ? "You can cancel until the kiosk starts preparing. You'll be refunded."
                : "This order can't be cancelled because the kiosk has started on it."}
            </p>
            <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <AlertDialogContent className="rounded-2xl border-border bg-popover">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">
                    Cancel order {order.number}?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[15px]">
                    {formatKsh(order.total)} will go back to your M-Pesa (simulated).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="h-12 rounded-[10px] text-[15px]">
                    Keep order
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="h-12 rounded-[10px] bg-destructive text-[15px] text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => cancelOrderByGuest(order.id)}
                  >
                    Cancel order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </div>

      <HelpSheetView open={helpOpen} onOpenChange={setHelpOpen} order={order} />
    </AppShell>
  );
}

function clock(ms: number) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
}
