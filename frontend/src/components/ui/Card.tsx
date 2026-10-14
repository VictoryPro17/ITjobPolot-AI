import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-card", className)} {...props} />;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}

export function CardHeader({ title, description, action, icon: Icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 whitespace-nowrap">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
