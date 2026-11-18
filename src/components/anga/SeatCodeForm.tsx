import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { PageTitle } from "@/components/anga/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseSeatCode } from "@/lib/rules";

/** Fallback for guests who can't scan: type the code printed on the seat sign. */
export function SeatCodeForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseSeatCode(value);
        if (!parsed) return setError(true);
        navigate({
          to: "/q/$code",
          params: { code: value.trim().toUpperCase().replace(/\s+/g, "") },
        });
      }}
    >
      <PageTitle>Enter the code on your seat</PageTitle>
      <p className="mt-1 text-[13px] text-muted-foreground">
        It's printed under the QR, for example SKY-2-F7.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          aria-label="Seat code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase().slice(0, 12));
            setError(false);
          }}
          placeholder="SKY-2-F7"
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          className="h-12 flex-1 rounded-lg border-input bg-muted font-display text-lg tracking-wider uppercase md:text-lg"
        />
        <Button type="submit">Go</Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-destructive">That doesn't look like a seat code.</p>
      ) : null}
    </form>
  );
}
