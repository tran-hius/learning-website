import { cn } from "@/lib/utils";

/** Container trung tâm: max-w-6xl, padding thoải mái (guide mục 5). */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}
