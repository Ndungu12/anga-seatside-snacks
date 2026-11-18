import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Large tap targets by default (min 48px) for use in a dark auditorium.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold cursor-pointer transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#0a63cc]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-transparent text-foreground hover:bg-surface-2",
        accent: "border border-link/50 bg-transparent text-link hover:bg-primary-soft",
        "destructive-outline":
          "border border-destructive/60 bg-transparent text-destructive hover:bg-destructive-soft",
        secondary: "border border-border bg-elevated text-foreground hover:bg-[#30353d]",
        highlight: "bg-highlight text-highlight-foreground hover:bg-[#ffe23d]",
        ghost: "text-foreground hover:bg-surface-2",
        link: "text-link underline underline-offset-4",
      },
      size: {
        default: "h-12 px-5 text-[15px]",
        sm: "h-10 px-3 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
