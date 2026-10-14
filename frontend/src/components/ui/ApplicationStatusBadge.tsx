import type { ApplicationStatus } from "@/features/applications/api";
import { statusConfig } from "@/features/applications/status";
import { cn } from "@/lib/utils";

export function ApplicationStatusBadge({ status, size = "md" }: { status: ApplicationStatus; size?: "sm" | "md" }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      title={config.description}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground",
        size === "sm" && "px-2 text-[11px]",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" style={{ color: config.colorVar }} aria-hidden="true" />
      {config.label}
    </span>
  );
}
