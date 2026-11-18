import { TICKET_CHANNEL_LABEL, type Booking } from "@/lib/bookings";
import { formatKsh, VENUES } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AngaLogo } from "./Brand";
import { QrCode } from "./Qr";

/**
 * Digital e-ticket, following the printed Anga ticket: blue frame with yellow corner
 * stripes, logo, order reference, customer, film, location and seat, schedule,
 * concessions, total and QR. Dark interior so it stays comfortable in the hall.
 */
export function TicketCard({ booking, seat }: { booking: Booking; seat?: string | null }) {
  return (
    <article
      aria-label={`E-ticket ${booking.ref}`}
      className="relative overflow-hidden rounded-[22px] bg-primary p-[10px]"
    >
      <span aria-hidden className="absolute -left-6 top-3 h-3 w-24 -rotate-45 bg-highlight" />
      <span aria-hidden className="absolute -left-2 top-9 h-3 w-16 -rotate-45 bg-highlight" />
      <div className="relative rounded-2xl bg-surface p-5">
        <div className="flex items-start gap-4">
          <AngaLogo size={44} />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[12px] text-muted-foreground">Booking confirmed</p>
            <p className="font-display text-[13px] font-bold tracking-wide text-link">
              {booking.ref}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[14px] text-muted-foreground">{booking.customer}</p>
        <h2 className="font-display text-[22px] font-extrabold leading-tight">{booking.film}</h2>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
              Location
            </dt>
            <dd className="mt-0.5">{VENUES[booking.venue]}</dd>
            <dd className="text-muted-foreground">Screen {booking.screen}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
              Schedule
            </dt>
            <dd className="mt-0.5">Today</dd>
            <dd className="text-muted-foreground tabular">
              {booking.start}–{booking.end}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
              Seat(s)
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {booking.tickets.map((t) => (
                <span
                  key={t.seat}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-display text-[14px] font-extrabold",
                    seat === t.seat ? "bg-highlight text-highlight-foreground" : "bg-elevated",
                  )}
                >
                  {t.seat}
                </span>
              ))}
            </dd>
          </div>
        </dl>

        {booking.concessions.length ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
              Concessions
            </p>
            <ul className="mt-1.5 space-y-1 text-[14px]">
              {booking.concessions.map((c) => (
                <li key={c.name} className="flex justify-between gap-2">
                  <span>
                    {c.name} <span className="text-muted-foreground">× {c.qty}</span>
                  </span>
                  <span className="tabular text-muted-foreground">{formatKsh(c.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-[12px] text-muted-foreground">
              {TICKET_CHANNEL_LABEL[booking.channel]}
            </p>
            <p className="font-display text-lg font-extrabold tabular">
              <span className="text-[13px] font-semibold text-muted-foreground">Total </span>
              {formatKsh(booking.total)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-1">
            <QrCode value={booking.ref} size={72} />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Compact read-only details, used where the full ticket would be too much. */
export function BookingSummary({ booking }: { booking: Booking }) {
  return <TicketCard booking={booking} />;
}

/** One seat per order: guests with several tickets choose who receives it. */
export function SeatChoice({
  booking,
  value,
  onChange,
  disabledSeats = [],
}: {
  booking: Booking;
  value: string | null;
  onChange: (seat: string) => void;
  disabledSeats?: string[];
}) {
  return (
    <fieldset>
      <legend className="font-display text-[16px] font-bold">Deliver to which seat?</legend>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Each order goes to one seat. Pick who receives it.
      </p>
      <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
        {booking.tickets.map((t) => {
          const on = value === t.seat;
          const disabled = disabledSeats.includes(t.seat);
          return (
            <button
              key={t.seat}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onChange(t.seat)}
              className={cn(
                "flex h-16 min-w-24 flex-col items-center justify-center rounded-xl border px-4 transition-colors duration-150 disabled:opacity-40",
                on
                  ? "border-highlight bg-highlight text-highlight-foreground"
                  : "border-border bg-surface-2 hover:border-link/60",
              )}
            >
              <span className="font-display text-xl font-extrabold leading-none">{t.seat}</span>
              <span className={cn("mt-1 text-[11px]", on ? "" : "text-muted-foreground")}>
                {t.ref}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
