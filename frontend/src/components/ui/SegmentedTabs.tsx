import { cn } from "@/lib/utils";

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number }[];
}

export function SegmentedTabs<T extends string>({ value, onChange, items }: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined ? <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
