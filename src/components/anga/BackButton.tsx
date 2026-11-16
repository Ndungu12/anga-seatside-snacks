import { ArrowLeft } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";

/** Wrap a <Link aria-label="..."> to get a large back arrow, or pass onClick. */
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
      <Button asChild variant="ghost" size="icon">
        {children}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label ?? "Go back"}>
      <ArrowLeft />
    </Button>
  );
}

export { ArrowLeft as BackIcon };
