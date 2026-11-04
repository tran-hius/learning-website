import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Progress bar đơn giản, đầy dần từ trái sang phải (guide mục 5).
 * Dùng div — không cần Radix cho MVP.
 */
function Progress({
  value,
  className,
  indicatorClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** 0 → 100 */
  value: number;
  indicatorClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-cream-deep", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-teal-fresh-400 transition-[width] duration-300 ease-out", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
