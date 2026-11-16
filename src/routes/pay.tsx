import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleAlert, CircleCheck, LoaderCircle, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/anga/AppShell";
import { ClosedNotice, LoadingBlock, NoSession } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKsh, summarizeCart } from "@/lib/data";
import { formatPhone, isValidPhone, PAYMENT_WAIT_MS } from "@/lib/rules";
import {
  clearCart,
  createOrder,
  devStore,
  ordersStore,
  setPhone,
  updateOrder,
  useCart,
  useHydrated,
  useOrderingWindow,
  useSession,
} from "@/lib/store";

export const Route = createFileRoute("/pay")({
  head: () => ({
    meta: [
      { title: "Pay with M-Pesa — Anga Seat Order" },
      { name: "description", content: "Simulated M-Pesa payment for your seat order." },
      { property: "og:title", content: "Pay with M-Pesa — Anga Seat Order" },
      { property: "og:description", content: "Confirm your M-Pesa number to pay for your order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PayPage,
});

type Phase = "form" | "waiting" | "failed" | "success";

function PayPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const cart = useCart();
  const orderWindow = useOrderingWindow(session?.end);

  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidTotal, setPaidTotal] = useState(0);
  const timer = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("form");
  const orderIdRef = useRef<string | null>(null);
  phaseRef.current = phase;
  orderIdRef.current = orderId;

  // Leaving mid-prompt counts as an unpaid attempt so staff never wait on it.
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (phaseRef.current === "waiting" && orderIdRef.current) {
        updateOrder(orderIdRef.current, { payment: "failed" });
      }
    },
    [],
  );

  if (!hydrated) {
    return (
      <AppShell backTo="/cart" backLabel="Back to cart">
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
  const phone = cart.phone;

  function sendRequest() {
    if (!session) return;
    if (!isValidPhone(phone)) {
      setError("Enter a Safaricom number in the format 07xx xxx xxx.");
      return;
    }
    setError(null);
    let id = orderId;
    const existing = id ? ordersStore.get().find((o) => o.id === id) : undefined;
    if (existing && existing.payment === "failed") {
      updateOrder(existing.id, { payment: "pending", phone: formatPhone(phone) });
    } else {
      const order = createOrder(session, cart, formatPhone(phone));
      id = order.id;
      setOrderId(order.id);
      setPaidTotal(order.total);
    }
    setPhase("waiting");
    const resolvedId = id!;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (devStore.get().simulateFailure) {
        updateOrder(resolvedId, { payment: "failed" });
        setPhase("failed");
      } else {
        updateOrder(resolvedId, { payment: "paid" });
        clearCart();
        setPhase("success");
      }
    }, PAYMENT_WAIT_MS);
  }

  function cancelWaiting() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (orderId) updateOrder(orderId, { payment: "failed" });
    setPhase("form");
  }

  if (phase === "success" && orderId) {
    return (
      <AppShell>
        <div className="flex flex-col items-center py-8 text-center" role="status">
          <CircleCheck aria-hidden className="size-16 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold">Payment received</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {formatKsh(paidTotal)} paid with M-Pesa (simulated).
          </p>
          <p className="mt-1 text-base">The kiosk has your order. We'll bring it to seat {session.seat}.</p>
          <Button asChild size="lg" className="mt-8 w-full text-lg">
            <Link to="/order/$orderId" params={{ orderId }}>
              Track my order
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (summary.count === 0) {
    return (
      <AppShell backTo="/menu" backLabel="Back to menu">
        <div className="mt-10 text-center">
          <p className="text-lg">Your cart is empty.</p>
          <Button asChild variant="accent" className="mt-4">
            <Link to="/menu">Browse the menu</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (phase === "waiting") {
    return (
      <AppShell>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="relative">
            <Smartphone aria-hidden className="size-16 text-primary" />
          </div>
          <div role="status">
            <h1 className="mt-4 font-display text-3xl font-bold">Check your phone</h1>
          </div>
          <p className="mt-3 text-lg">
            Enter your M-Pesa PIN on the prompt sent to{" "}
            <span className="font-bold">{formatPhone(phone)}</span> to pay{" "}
            <span className="font-bold">{formatKsh(summary.total)}</span>.
          </p>
          <p className="mt-6 flex items-center gap-2 text-base text-muted-foreground">
            <LoaderCircle aria-hidden className="size-5 motion-safe:animate-spin-slow" />
            Waiting for confirmation…
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This is a simulation. No money will move.
          </p>
          <Button variant="outline" className="mt-8 w-full" onClick={cancelWaiting}>
            Cancel
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell backTo="/cart" backLabel="Back to cart">
      <h1 className="font-display text-2xl font-bold">Pay with M-Pesa</h1>
      <div className="mt-4 flex items-baseline justify-between rounded-2xl border border-border bg-card p-4">
        <p className="text-base text-muted-foreground">
          {summary.count} {summary.count === 1 ? "item" : "items"}
        </p>
        <p className="font-display text-2xl font-bold tabular-nums">{formatKsh(summary.total)}</p>
      </div>
      <p className="mt-1 text-right text-sm text-muted-foreground">Placeholder prices</p>

      {phase === "failed" ? (
        <div role="alert" className="mt-4 rounded-2xl border-2 border-destructive bg-destructive-soft p-4">
          <p className="flex items-center gap-2 text-lg font-bold text-destructive">
            <CircleAlert aria-hidden className="size-5 shrink-0" />
            Payment didn't go through
          </p>
          <p className="mt-1 text-base">
            You have not been charged. Check that your phone is on and you have enough M-Pesa
            balance, then try again.
          </p>
        </div>
      ) : null}

      {orderWindow.closed ? (
        <div className="mt-4">
          <ClosedNotice end={session.end} cutoff={orderWindow.cutoff} />
        </div>
      ) : null}

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          sendRequest();
        }}
        noValidate
      >
        <Label htmlFor="mpesa-phone" className="text-base">
          M-Pesa phone number
        </Label>
        <Input
          id="mpesa-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="07xx xxx xxx"
          value={phone}
          onChange={(e) => {
            setPhone(formatPhone(e.target.value));
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby="mpesa-phone-hint"
          className="mt-2 h-14 rounded-xl border-2 font-display text-xl tracking-wider tabular-nums md:text-xl"
        />
        <p
          id="mpesa-phone-hint"
          className={error ? "mt-2 text-base text-destructive" : "mt-2 text-sm text-muted-foreground"}
        >
          {error ?? "Format: 07xx xxx xxx. We'll send a payment prompt to this phone."}
        </p>

        <Button
          type="submit"
          size="lg"
          className="mt-6 w-full text-lg"
          disabled={orderWindow.closed}
        >
          {phase === "failed" ? "Try again" : `Pay ${formatKsh(summary.total)}`}
        </Button>
      </form>
    </AppShell>
  );
}
