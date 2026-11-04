import * as React from "react";
import { cn } from "@/lib/utils";

/** Badge bo tròn đầy, màu mềm theo palette guide. */
const badgeVariants = {
  variant: {
    default: "bg-teal-fresh-100 text-teal-fresh-600",
    coral: "bg-coral-100 text-coral-600",
    honey: "bg-honey-100 text-honey-500",
    mint: "bg-mint-100 text-mint-600",
    sky: "bg-sky-soft-100 text-sky-soft-600",
    outline: "border border-ink-300/60 text-ink-700",
  } as const,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants.variant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants.variant[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
