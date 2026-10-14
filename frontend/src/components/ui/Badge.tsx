import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-foreground border-border",
  primary: "bg-primary/10 text-primary-text border-primary/20",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", toneClasses[tone], className)}
      {...props}
    />
  );
}
