import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, LoaderCircle, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell, PageTitle, SectionLabel } from "@/components/anga/AppShell";
import { BackButton, BackIcon } from "@/components/anga/BackButton";
import { ClosedNotice, LoadingBlock, NoSession, Notice } from "@/components/anga/Notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKsh, summarizeCart, VENUES } from "@/lib/data";
import { initiateStkPush } from "@/lib/mpesa";
import {
  formatPhone,
  isValidPhone,
  MAX_OPEN_ORDERS_PER_SEAT,
  PAYMENT_OUTCOME_LABEL,
  PAYMENT_WAIT_MS,
  paymentFailureMessage,
  seatOrderLimitReached,
  type PaymentOutcome,
} from "@/lib/rules";
import {
  cancelOrderByGuest,
  clearCart,
  createOrder,
  devStore,
  findReusableOrder,
  openOrdersForSeat,
  refreshUnpaidOrder,
  setPhone,
  useCart,
  useDev,
  useHydrated,
  useNow,
  useOrderingWindow,
  useOrders,
  useSession,
  type Order,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pay")({
  head: () => ({
    meta: [
      { title: "Checkout — ANGA In-Seat" },
      { name: "description", content: "Simulated M-Pesa checkout for your in-seat order." },
    ],
  }),
  component: PayPage,
});

const todayLabel = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date());

/**
 * Checkout and the simulated M-Pesa STK push. The browser only starts the payment and
 * watches the order; it becomes PAID when the (simulated) callback is verified.
 */
function PayPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const cart = useCart();
  const orders = useOrders();
  const dev = useDev();
  const orderWindow = useOrderingWindow(session?.end);
  const now = useNow(500);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [name, setName] = useState<string | null>(null);

  const order = orderId ? orders.find((o) => o.id === orderId) : undefined;
  const attempt = order?.attempts.at(-1);
  const isPaid = Boolean(order?.paidAt) && order?.status !== "refund_pending";

  useEffect(() => {
    if (isPaid) {
      clearCart();
      setWaiting(false);
    }
  }, [isPaid]);

  useEffect(() => {
    if (order?.status === "payment_failed") setWaiting(false);
  }, [order?.status]);

  if (!hydrated) {
    return (
      <AppShell showContext>
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

  if (isPaid && order) return <Confirmation order={order} />;

  const summary = summarizeCart(cart.lines);
  const phone = cart.phone;
  const customer = name ?? session.customerName ?? "";
  const openForSeat = openOrdersForSeat(
    orders,
    session.screeningId,
    session.seat,
    orderId ?? undefined,
  ).filter((o) => o.status !== "pending_payment");
  const limitReached = seatOrderLimitReached(openForSeat.length);

  function pay() {
    if (!session) return;
    if (!isValidPhone(phone)) {
      setError("Enter an M-Pesa number in the format 07xx xxx xxx.");
      return;
    }
    if (limitReached || waiting) return;
    setError(null);
    const reusable =
      (orderId ? orders.find((o) => o.id === orderId) : undefined) ?? findReusableOrder(session);
    let id: string;
    if (
      reusable &&
      (reusable.status === "pending_payment" || reusable.status === "payment_failed")
    ) {
      refreshUnpaidOrder(reusable.id, cart, formatPhone(phone), customer);
      id = reusable.id;
    } else {
      id = createOrder(session, cart, formatPhone(phone), customer).id;
    }
    setOrderId(id);
    setWaiting(true);
    initiateStkPush(id, formatPhone(phone));
  }

  function stopWaiting() {
    if (order && order.status === "pending_payment") cancelOrderByGuest(order.id);
    setWaiting(false);
    setOrderId(null);
  }

  // ---- Waiting for M-Pesa ----
  if (waiting && order && attempt?.state === "pending") {
    const elapsed = now - attempt.at;
    const processing = elapsed > PAYMENT_WAIT_MS + 1500;
    const steps = [
      { label: "Payment request sent", done: true },
      { label: "Approve on your phone", done: processing, current: !processing },
      {
        label: processing ? "Checking with M-Pesa" : "Payment confirmed",
        done: false,
        current: processing,
      },
    ];
    return (
      <AppShell>
        <div className="mx-auto max-w-md pt-4 text-center" role="status" aria-live="polite">
          <div className="relative mx-auto grid size-24 place-items-center">
            <span className="absolute inset-0 rounded-full border-2 border-primary/30" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-link motion-safe:animate-spin" />
            {processing ? (
              <Clock className="size-9 text-warning" />
            ) : (
              <Smartphone className="size-9 text-link" />
            )}
          </div>
          <h1 className="mt-6 font-display text-[24px] font-extrabold">
            {processing ? "Still processing" : "Check your phone"}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {processing ? (
              "We're checking your payment status. Please don't initiate another payment."
            ) : (
              <>
                A payment request for{" "}
                <b className="text-foreground tabular">{formatKsh(order.total)}</b> has been sent to{" "}
                <b className="text-foreground tabular">{attempt.phone}</b>. Enter your M-Pesa PIN to
                approve it.
              </>
            )}
          </p>
          <ol className="mx-auto mt-8 max-w-xs space-y-3 text-left">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-[14px]">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full",
                    s.done
                      ? "bg-success text-white"
                      : s.current
                        ? "border-2 border-link"
                        : "border border-input",
                  )}
                >
                  {s.done ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : s.current ? (
                    <LoaderCircle className="size-3.5 text-link motion-safe:animate-spin" />
                  ) : null}
                </span>
                <span className={s.done || s.current ? "text-foreground" : "text-muted-foreground"}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-[12px] text-subtle">Simulated M-Pesa. No money will move.</p>
          <Button variant="secondary" className="mt-4 w-full" onClick={stopWaiting}>
            I didn't get a prompt
          </Button>
        </div>
      </AppShell>
    );
  }

  const back = (
    <BackButton>
      <Link to="/cart" aria-label="Back to basket">
        <BackIcon />
      </Link>
    </BackButton>
  );

  if (summary.count === 0) {
    return (
      <AppShell back={back} showContext>
        <div className="mt-6">
          <p className="text-[15px]">Your basket is empty.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link to="/menu">Browse the menu</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const failure = order?.status === "payment_failed" && attempt?.outcome ? attempt.outcome : null;

  return (
    <AppShell back={back} showContext>
      <PageTitle eyebrow="Checkout">Review and pay</PageTitle>

      {failure ? (
        <Notice
          tone="error"
          role="alert"
          className="mt-5"
          title={failure === "timeout" ? "Payment timed out" : "We couldn't complete your payment"}
        >
          {paymentFailureMessage(failure)} Order {order?.number} is saved. Please try again.
        </Notice>
      ) : null}
      {limitReached ? (
        <Notice
          tone="attention"
          role="alert"
          title="This seat already has orders on the way"
          className="mt-5"
        >
          There are {MAX_OPEN_ORDERS_PER_SEAT} open orders for seat {session.seat}. Please wait for
          them or ask an usher.
        </Notice>
      ) : null}
      {orderWindow.closed ? (
        <div className="mt-5">
          <ClosedNotice end={session.end} cutoff={orderWindow.cutoff} />
        </div>
      ) : null}

      <section
        aria-label="Delivering to"
        className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-[14px] sm:grid-cols-4"
      >
        {[
          ["Cinema", VENUES[session.venue]],
          ["Film", session.film],
          ["Screening", `${session.start} · Screen ${session.screen}`],
          ["Seat", session.seat],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">{k}</p>
            <p
              className={cn(
                "mt-0.5 font-semibold",
                k === "Seat" && "font-display text-lg text-highlight",
              )}
            >
              {v}
            </p>
          </div>
        ))}
      </section>

      <section
        aria-label="Order summary"
        className="mt-4 rounded-2xl border border-border bg-surface p-4"
      >
        <SectionLabel>Order summary</SectionLabel>
        <ul className="mt-3 space-y-2.5">
          {summary.lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3 text-[14px]">
              <img src={l.item.image} alt="" className="size-10 rounded-lg object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  <span className="text-muted-foreground tabular">{l.qty}× </span>
                  {l.item.name}
                </span>
                {l.extras ? <span className="text-[12px] text-link">{l.extras}</span> : null}
              </span>
              <span className="tabular">{formatKsh(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        {cart.note ? (
          <p className="mt-3 text-[13px] text-muted-foreground">Note: {cart.note}</p>
        ) : null}
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-[14px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Seat delivery</span>
            <span className="text-success">{summary.fee ? formatKsh(summary.fee) : "Free"}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Total payable</span>
            <span className="font-display text-2xl font-extrabold tabular">
              {formatKsh(summary.total)}
            </span>
          </div>
        </div>
      </section>

      <form
        className="mt-4 space-y-4 rounded-2xl border border-border bg-surface p-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          pay();
        }}
      >
        <SectionLabel>Your details</SectionLabel>
        <div>
          <Label htmlFor="cust-name" className="text-sm font-semibold">
            Name{" "}
            <span className="font-normal text-muted-foreground">(so the runner can greet you)</span>
          </Label>
          <Input
            id="cust-name"
            value={customer}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="e.g. John"
            autoComplete="given-name"
            className="mt-2 h-12 rounded-xl border-border bg-surface-2 text-base"
          />
        </div>
        <div>
          <Label htmlFor="mpesa-phone" className="text-sm font-semibold">
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
            className="mt-2 h-13 rounded-xl border-border bg-surface-2 font-display text-xl font-bold tracking-wide tabular md:text-xl"
          />
          <p
            id="mpesa-phone-hint"
            className={
              error ? "mt-2 text-sm text-destructive" : "mt-2 text-[13px] text-muted-foreground"
            }
          >
            {error ?? "We'll send a payment prompt to this phone."}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-highlight/50 bg-highlight-soft px-4 py-3">
          <span className="grid size-10 place-items-center rounded-lg bg-success font-display text-[11px] font-extrabold text-white">
            M-PESA
          </span>
          <span className="flex-1 text-[14px]">
            <span className="block font-semibold">Pay with M-Pesa</span>
            <span className="text-muted-foreground">STK push to your phone · simulated</span>
          </span>
          <Check aria-hidden className="size-5 text-highlight" />
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-13 w-full text-[16px]"
          disabled={orderWindow.closed || limitReached || waiting}
        >
          {failure ? "Try again" : `Pay ${formatKsh(summary.total)} with M-Pesa`}
        </Button>
      </form>

      <details className="mt-6 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-muted-foreground">
        <summary className="cursor-pointer select-none font-semibold text-foreground">
          Demo: choose the M-Pesa result
        </summary>
        <div role="radiogroup" className="mt-3 grid gap-2">
          {(Object.keys(PAYMENT_OUTCOME_LABEL) as PaymentOutcome[]).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={dev.paymentOutcome === o}
              onClick={() => devStore.set({ ...dev, paymentOutcome: o })}
              className={cn(
                "flex h-11 items-center rounded-lg border px-3 text-left",
                dev.paymentOutcome === o
                  ? "border-link bg-primary-soft text-link"
                  : "border-border",
              )}
            >
              {PAYMENT_OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
        <p className="mt-2">No real payment is made. This control exists only in the prototype.</p>
      </details>
    </AppShell>
  );
}

/** C11: rewarding confirmation after a verified (simulated) payment. */
function Confirmation({ order }: { order: Order }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-md pt-2" role="status">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-20 place-items-center rounded-full bg-success text-white shadow-[0_0_0_10px_rgb(39_134_92_/_0.18)] motion-safe:animate-pop">
            <Check className="size-10" strokeWidth={3} />
          </span>
          <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.16em] text-success">
            Payment received
          </p>
          <h1 className="mt-1 font-display text-[26px] font-extrabold">Your order is confirmed</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {order.customerName !== "Guest" ? `Thanks, ${order.customerName.split(" ")[0]}. ` : ""}
            We'll bring it to seat <b className="text-highlight">{order.seat}</b>.
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <span className="text-[13px] font-semibold">Order number</span>
            <span className="font-display text-xl font-extrabold tracking-wide">
              {order.number}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-[14px]">
            {[
              ["Customer", order.customerName],
              ["Film", order.film],
              ["Cinema", VENUES[order.venue]],
              ["Screening", `${todayLabel()}, ${order.start}`],
              ["Screen", order.screen],
              ["Seat", order.seat],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
                  {k}
                </dt>
                <dd className="mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-1.5 border-t border-border p-4 text-[14px]">
            {order.lines.map((l) => (
              <li key={l.itemId} className="flex justify-between gap-3">
                <span>
                  <span className="text-muted-foreground tabular">{l.qty}× </span>
                  {l.name}
                  {l.extras ? <span className="text-muted-foreground"> · {l.extras}</span> : null}
                </span>
                <span className="tabular text-muted-foreground">{formatKsh(l.qty * l.price)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-border p-4">
            <span className="text-[14px] text-muted-foreground">
              Total paid · <span className="font-semibold text-foreground">{order.receipt}</span>
            </span>
            <span className="font-display text-xl font-extrabold tabular">
              {formatKsh(order.total)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-center text-[12px] text-subtle">
          Confirmation SMS sent to {order.phone} (simulated).
        </p>
        <Button asChild size="lg" className="mt-6 h-13 w-full text-[16px]">
          <Link to="/order/$orderId" params={{ orderId: order.id }}>
            Track my order
          </Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link to="/menu">Back to the menu</Link>
        </Button>
      </div>
    </AppShell>
  );
}
