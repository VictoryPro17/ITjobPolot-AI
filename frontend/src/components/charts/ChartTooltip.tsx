import type { ReactNode } from "react";

interface TooltipEntry {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
  stroke?: string;
  fill?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  title?: (label: string | number | undefined) => ReactNode;
  valueFormatter?: (value: string | number) => string;
}

/** Recharts-`content`-Komponente: <Tooltip content={<ChartTooltip />} />. */
export function ChartTooltip({ active, payload, label, title, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-card">
      <p className="font-medium">{title ? title(label) : label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry, index) => {
          const raw = Array.isArray(entry.value) ? entry.value[0] : entry.value;
          const value = raw as string | number | undefined;
          return (
            <li key={`${entry.name}-${index}`} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entry.color ?? entry.stroke ?? entry.fill }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto pl-3 font-medium text-foreground">
                {value == null ? "–" : valueFormatter ? valueFormatter(value) : value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
