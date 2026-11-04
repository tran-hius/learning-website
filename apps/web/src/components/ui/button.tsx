import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Button tối giản theo API shadcn/ui, token màu theo docs/ui-design-guide.md.
 * Bo tròn 12px (guide mục 5). Touch target ≥ 44px áp dụng cho MỌI size
 * (guide mục 9): default/lg dùng min-h 44/48px, `sm` và `icon` cũng ≥ 44px.
 */
const buttonVariants = {
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-[15px] font-semibold transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-fresh-400 cursor-pointer",
  variant: {
    default:
      "bg-teal-fresh-500 text-white hover:bg-teal-fresh-600 min-h-[44px] px-5",
    coral:
      "bg-coral-400 text-white hover:bg-coral-500 min-h-[44px] px-5",
    honey:
      "bg-honey-400 text-ink-900 hover:bg-honey-500 hover:text-white min-h-[44px] px-5",
    outline:
      "border border-ink-300/60 bg-paper text-ink-900 hover:bg-cream-deep min-h-[44px] px-5",
    ghost: "text-ink-700 hover:bg-cream-deep hover:text-ink-900 min-h-[44px] px-3",
    link: "text-teal-fresh-600 underline-offset-4 hover:underline",
  } as const,
  size: {
    default: "",
    sm: "min-h-[44px] px-3 text-sm",
    lg: "min-h-[48px] px-6 text-base",
    icon: "size-11 p-0",
  } as const,
};

export type ButtonVariant = keyof typeof buttonVariants.variant;
export type ButtonSize = keyof typeof buttonVariants.size;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants.base, buttonVariants.variant[variant], buttonVariants.size[size], className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
