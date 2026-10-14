import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Bildmarke von JobPilot: ein Papierflieger auf einem abgerundeten Quadrat.
 * Der Verlauf folgt der Akzentfarbe (--logo-from / --logo-to).
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-from)" />
          <stop offset="1" stopColor="var(--logo-to)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      {/* Fluegel */}
      <path d="M25.2 7.2 6.6 14.6c-.8.3-.8 1.4 0 1.7l5.3 2 2 5.3c.3.8 1.4.8 1.7 0L25.2 7.2Z" fill="white" />
      {/* Faltkante, leicht abgesetzt */}
      <path d="M25.2 7.2 11.9 18.3l2 5.3c.3.8 1.4.8 1.7 0L25.2 7.2Z" fill="white" fillOpacity="0.72" />
    </svg>
  );
}

/** Logo mit Schriftzug, z. B. fuer Seitenleiste und Anmeldeseiten. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={size === "lg" ? "h-10 w-10" : "h-8 w-8"} />
      <span className={cn("font-semibold tracking-tight", size === "lg" ? "text-xl" : "text-base")}>
        JobPilot
        <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-primary-text">
          AI
        </span>
      </span>
    </span>
  );
}
