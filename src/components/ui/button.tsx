import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        accent:
          "bg-accent text-accent-foreground shadow-[0_10px_24px_-14px_hsl(var(--accent))] hover:bg-finance-deep",
        secondary: "bg-secondary text-secondary-foreground hover:bg-finance-soft",
        outline:
          "border border-border bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-foreground/15 hover:bg-muted/70",
        ghost: "text-foreground hover:bg-muted/80",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 text-sm",
        sm: "h-10 px-4 text-[13px]",
        lg: "h-14 px-7 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
});

export { Button, buttonVariants };
