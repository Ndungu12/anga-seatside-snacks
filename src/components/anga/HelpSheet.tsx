import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_CONTACTS, VENUES } from "@/lib/data";
import {
  createRunnerRequest,
  useActiveOrder,
  useHydrated,
  useRunnerRequests,
  useSession,
  type IssueType,
  type Order,
  type RunnerRequest,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const ISSUES: { id: IssueType; label: string }[] = [
  { id: "missing_item", label: "Something is missing" },
  { id: "wrong_item", label: "I got the wrong item" },
  { id: "taking_too_long", label: "It's taking too long" },
  { id: "spilled", label: "Something spilled" },
  { id: "other", label: "Something else" },
];

const REQUEST_STATUS: Record<RunnerRequest["status"], string> = {
  open: "Sent. Waiting for the kiosk",
  acknowledged: "The kiosk has it. An usher is coming",
  resolved: "Resolved",
};

type View = "menu" | "issue" | "preview-call" | "preview-whatsapp";

/** Need help: call, WhatsApp, send a runner, or report a problem with an order. */
export function HelpPanel({ order, onDone }: { order?: Order | undefined; onDone?: () => void }) {
  const session = useSession();
  const active = useActiveOrder(session);
  const requests = useRunnerRequests();
  const target = order ?? active;
  const [view, setView] = useState<View>("menu");
  const [issue, setIssue] = useState<IssueType | null>(null);
  const [message, setMessage] = useState("");

  const ctx = target
    ? { venue: target.venue, screen: target.screen, film: target.film, seat: target.seat }
    : session
      ? { venue: session.venue, screen: session.screen, film: session.film, seat: session.seat }
      : null;
  const contacts = ctx ? SUPPORT_CONTACTS[ctx.venue] : null;
  const mine = ctx
    ? requests.filter(
        (r) =>
          r.seat === ctx.seat &&
          r.screen === ctx.screen &&
          r.venue === ctx.venue &&
          r.status !== "resolved",
      )
    : [];
  const waText = ctx
    ? `Hello Anga ${VENUES[ctx.venue]}. I'm in Screen ${ctx.screen}, seat ${ctx.seat} (${ctx.film})${target ? `, order ${target.number}` : ""}. I need help with: `
    : "";

  function send(type: RunnerRequest["type"]) {
    if (!ctx) return;
    createRunnerRequest({
      type,
      issue: type === "issue" ? issue : null,
      message: message.trim(),
      venue: ctx.venue,
      screen: ctx.screen,
      film: ctx.film,
      seat: ctx.seat,
      orderId: target?.id ?? null,
      orderNumber: target?.number ?? null,
    });
    setView("menu");
    setIssue(null);
    setMessage("");
  }

  if (view === "issue" && target) {
    return (
      <div>
        <p className="text-sm font-medium">What went wrong with order {target.number}?</p>
        <div role="radiogroup" className="mt-3 divide-y divide-border border-y border-border">
          {ISSUES.map((i) => (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={issue === i.id}
              onClick={() => setIssue(i.id)}
              className="flex h-12 w-full items-center justify-between text-left text-[15px]"
            >
              {i.label}
              <span
                aria-hidden
                className={cn(
                  "size-4 rounded-full border",
                  issue === i.id ? "border-[5px] border-link" : "border-input",
                )}
              />
            </button>
          ))}
        </div>
        <label htmlFor="issue-text" className="mt-4 block text-sm font-medium">
          Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="issue-text"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 140))}
          rows={2}
          className="mt-2 rounded-lg border-input bg-muted text-base"
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setView("menu")}>
            Back
          </Button>
          <Button disabled={!issue} onClick={() => send("issue")}>
            Send report
          </Button>
        </div>
      </div>
    );
  }

  if (view === "preview-call" || view === "preview-whatsapp") {
    const wa = view === "preview-whatsapp";
    return (
      <div>
        <p className="text-[15px] font-medium">{wa ? "WhatsApp message" : "Call the kiosk"}</p>
        {wa ? (
          <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-[15px]">{waText}…</p>
        ) : (
          <p className="mt-2 text-[15px] text-muted-foreground">
            Opens your phone's dialler to the {ctx ? VENUES[ctx.venue] : ""} snack kiosk.
          </p>
        )}
        <p className="mt-3 text-[13px] text-muted-foreground">
          Demo: Anga's official number isn't configured yet, so nothing is sent.
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={() => setView("menu")}>
          Back
        </Button>
      </div>
    );
  }

  const rowCls = "flex min-h-14 w-full items-center justify-between gap-4 py-2 text-left";
  const sub = "block text-[13px] text-muted-foreground";

  return (
    <div className="space-y-5">
      {mine.length > 0 ? (
        <ul aria-live="polite" className="space-y-2">
          {mine.map((r) => (
            <li key={r.id} className="border-l-2 border-highlight py-1 pl-4">
              <p className="text-[15px] font-semibold text-highlight">
                {r.type === "runner" ? "Runner requested" : "Problem reported"} · {r.number}
              </p>
              <p className="text-sm text-muted-foreground">
                {REQUEST_STATUS[r.status]}. Please stay in seat {r.seat}.
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="divide-y divide-border border-y border-border">
        <li>
          <button type="button" className={rowCls} disabled={!ctx} onClick={() => send("runner")}>
            <span>
              <span className="text-[15px] font-medium">Send someone to my seat</span>
              <span className={sub}>
                {ctx
                  ? `An usher comes to seat ${ctx.seat}, Screen ${ctx.screen}`
                  : "Choose your show first"}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
          </button>
        </li>
        {target ? (
          <li>
            <button type="button" className={rowCls} onClick={() => setView("issue")}>
              <span>
                <span className="text-[15px] font-medium">Report a problem with my order</span>
                <span className={sub}>Order {target.number}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
            </button>
          </li>
        ) : null}
        <li>
          {contacts?.kioskPhone ? (
            <a className={rowCls} href={`tel:+${contacts.kioskPhone}`}>
              <span className="text-[15px] font-medium">Call the kiosk</span>
              <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
            </a>
          ) : (
            <button
              type="button"
              className={rowCls}
              disabled={!ctx}
              onClick={() => setView("preview-call")}
            >
              <span>
                <span className="text-[15px] font-medium">Call the kiosk</span>
                <span className={sub}>Speak to the snack counter</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
            </button>
          )}
        </li>
        <li>
          {contacts?.whatsapp ? (
            <a
              className={rowCls}
              href={`https://wa.me/${contacts.whatsapp}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noreferrer"
            >
              <span className="text-[15px] font-medium">Message us on WhatsApp</span>
              <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
            </a>
          ) : (
            <button
              type="button"
              className={rowCls}
              disabled={!ctx}
              onClick={() => setView("preview-whatsapp")}
            >
              <span>
                <span className="text-[15px] font-medium">Message us on WhatsApp</span>
                <span className={sub}>Your seat and order are filled in</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
            </button>
          )}
        </li>
      </ul>

      <p className="text-[13px] text-muted-foreground">
        Or raise your hand when an usher walks past. {onDone ? "" : ""}
      </p>
    </div>
  );
}

/** Header "Help" control. Text, not an icon, so it is unmistakable in the dark. */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-11 px-3 text-[14px] font-medium text-link"
        onClick={() => setOpen(true)}
      >
        Need help?
      </Button>
      {hydrated ? <HelpSheetView open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}

export function HelpSheetView({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | undefined;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-t-xl border-border bg-popover px-5 pb-8"
      >
        <SheetHeader className="px-0 text-left">
          <SheetTitle className="font-display text-lg font-semibold">Need help?</SheetTitle>
          <SheetDescription>We'll sort it out without you leaving your seat.</SheetDescription>
        </SheetHeader>
        <HelpPanel order={order} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
