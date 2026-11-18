import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MoreHorizontal, ShieldCheck, X } from "lucide-react";
import { useEffect } from "react";

import { AngaLogo } from "@/components/anga/Brand";
import { TicketCard } from "@/components/anga/BookingSummary";
import { CinemaCards } from "@/components/anga/CinemaCard";
import { Button } from "@/components/ui/button";
import { findBooking } from "@/lib/bookings";
import { nairobiMinutes } from "@/lib/rules";
import { sessionFromBooking } from "@/lib/sessions";
import { captureAttribution, setPhone, startSession, useHydrated } from "@/lib/store";

export const Route = createFileRoute("/miniapp")({
  head: () => ({
    meta: [
      { title: "Anga Cinemas Mini App (simulated)" },
      { name: "description", content: "Simulated M-Pesa Mini App entry to in-seat ordering." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MiniAppPage,
});

const MINIAPP_UTM = {
  utm_source: "mpesa_miniapp",
  utm_medium: "miniapp",
  utm_campaign: "evergreen",
};
const ACCOUNT = { name: "Brian Otieno", phone: "0722 111 104", ref: "MP-90311" };

/**
 * M03: ordering inside the M-Pesa Mini App. The container chrome is generic and labelled
 * as simulated: no Safaricom branding, authentication or payment service is connected.
 */
function MiniAppPage() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const booking = hydrated ? findBooking(ACCOUNT.ref, nairobiMinutes(new Date())) : undefined;

  useEffect(() => {
    if (!hydrated) return;
    captureAttribution("/miniapp", `?${new URLSearchParams(MINIAPP_UTM).toString()}`);
    // The Mini App already knows the customer's M-Pesa number.
    setPhone(ACCOUNT.phone);
  }, [hydrated]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-[#0b0c0f] px-2">
        <span className="grid size-10 place-items-center text-muted-foreground" aria-hidden>
          <ChevronLeft className="size-5" />
        </span>
        <span className="flex-1 text-center text-[14px] font-semibold">Anga Cinemas</span>
        <span
          className="flex h-8 items-center gap-1 rounded-full border border-border px-2 text-muted-foreground"
          aria-hidden
        >
          <MoreHorizontal className="size-4" />
          <span className="h-4 w-px bg-border" />
          <X className="size-4" />
        </span>
      </div>
      <p className="bg-success-soft px-4 py-2 text-center text-[12px] text-success">
        Simulated M-Pesa Mini App · no real M-Pesa account, login or payment is connected
      </p>

      <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
        <div className="flex items-center gap-3">
          <AngaLogo size={40} />
          <div>
            <p className="text-[13px] text-muted-foreground">Signed in with M-Pesa (simulated)</p>
            <p className="font-display text-[18px] font-extrabold">
              Hi {ACCOUNT.name.split(" ")[0]} · {ACCOUNT.phone.replace(/(\d{4}) (\d{3})/, "$1 ***")}
            </p>
          </div>
        </div>

        {booking ? (
          <section className="mt-6">
            <h1 className="font-display text-[20px] font-extrabold">You have a ticket for today</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Order snacks straight to your seat. Payment comes from this M-Pesa account.
            </p>
            <div className="mt-4">
              <TicketCard booking={booking} seat={booking.tickets[0]!.seat} />
            </div>
            <Button
              size="lg"
              className="mt-4 h-13 w-full text-[16px]"
              onClick={() => {
                startSession({
                  ...sessionFromBooking(booking, booking.tickets[0]!, "booking_ref", null),
                  entryPoint: "mpesa_miniapp",
                });
                navigate({ to: "/menu" });
              }}
            >
              Order to seat {booking.tickets[0]!.seat}
            </Button>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="font-display text-[18px] font-extrabold">Or choose a cinema</h2>
          <div className="mt-3">
            <CinemaCards search={MINIAPP_UTM} />
          </div>
        </section>

        <p className="mt-8 flex items-center gap-2 text-[12px] text-subtle">
          <ShieldCheck aria-hidden className="size-4" /> In production the Mini App passes a signed
          customer token; here it is mocked.
        </p>
      </main>
    </div>
  );
}
