import { Link } from "react-router-dom";
import { KanbanSquare, List } from "lucide-react";

import { cn } from "@/lib/utils";

/** Umschalter zwischen Listen- und Board-Ansicht derselben Bewerbungen (wie Ansichten in Notion). */
export function ViewSwitch({ current, search }: { current: "list" | "board"; search?: string }) {
  const query = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
  const items = [
    { key: "list", label: "Liste", icon: List, to: `/bewerbungen${query}` },
    { key: "board", label: "Board", icon: KanbanSquare, to: `/board${query}` },
  ] as const;

  return (
    <nav aria-label="Ansicht" className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {items.map((item) => {
        const active = item.key === current;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
