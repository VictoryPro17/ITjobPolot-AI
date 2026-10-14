import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning";

interface ProgressProps {
  value: number;
  tone?: Tone;
  className?: string;
  /** Zugaenglicher Name, z. B. "Profil-Vollständigkeit". */
  label?: string;
}

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
};

export function Progress({ value, tone = "primary", className, label = "Fortschritt" }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", toneClasses[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}
