import { ChevronLeft } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";

/** Wrap a <Link aria-label="..."> to get a large back control, or pass onClick. */
export function BackButton({
  children,
  onClick,
  label,
}: {
  children?: ReactElement;
  onClick?: () => void;
  label?: string;
}) {
  if (children) {
    return (
      <Button asChild variant="ghost" size="icon" className="text-foreground">
        {children}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label ?? "Go back"}>
      <ChevronLeft />
    </Button>
  );
}

export { ChevronLeft as BackIcon };
