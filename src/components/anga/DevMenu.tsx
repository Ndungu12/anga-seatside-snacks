import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ORDER_CUTOFF_MINUTES, type WindowOverride } from "@/lib/rules";
import { devStore, resetAllDemoData, useDev } from "@/lib/store";
import { cn } from "@/lib/utils";

const WINDOW_OPTIONS: { value: WindowOverride; label: string }[] = [
  { value: "auto", label: "Follow film end time" },
  { value: "open", label: "Force open" },
  { value: "closed", label: "Force closed" },
];

/** Hidden testing menu. Opened by tapping the ANGA wordmark three times. */
export function DevMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dev = useDev();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl border-border bg-popover">
        <SheetHeader className="text-left">
          <SheetTitle>Developer menu</SheetTitle>
          <SheetDescription>For testing only. Guests never see this.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
            <Label htmlFor="sim-fail" className="text-base leading-snug">
              Simulate M-Pesa payment failure
            </Label>
            <Switch
              id="sim-fail"
              checked={dev.simulateFailure}
              onCheckedChange={(v) => devStore.set({ ...dev, simulateFailure: v })}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-base font-semibold">
              Ordering window (closes {ORDER_CUTOFF_MINUTES} min before end)
            </legend>
            <div className="grid grid-cols-1 gap-2">
              {WINDOW_OPTIONS.map((opt) => {
                const selected = dev.windowOverride === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => devStore.set({ ...dev, windowOverride: opt.value })}
                    className={cn(
                      "flex h-12 items-center rounded-xl border-2 px-4 text-left text-base",
                      selected
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link to="/staff" onClick={() => onOpenChange(false)}>
                Staff queue
              </Link>
            </Button>
            <Button
              variant="destructive-outline"
              onClick={() => {
                if (window.confirm("Delete all demo orders, cart and seat?")) {
                  resetAllDemoData();
                  onOpenChange(false);
                }
              }}
            >
              Reset demo
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
