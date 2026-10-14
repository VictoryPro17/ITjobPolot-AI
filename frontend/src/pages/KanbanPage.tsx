import { useState, type DragEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronDown,
  ChevronsLeftRight,
  ChevronsRightLeft,
  EyeOff,
  KanbanSquare,
  MapPin,
  Plus,
  Rows3,
  Rows4,
  Search,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSummary, workModelLabels, type ApplicationListItem, type ApplicationStatus } from "@/features/applications/api";
import { applicationStatusOrder, statusConfig } from "@/features/applications/status";
import { ViewSwitch } from "@/features/applications/ViewSwitch";
import { useBoardPreferences, type BoardSort, type CardDensity } from "@/features/kanban/useBoardPreferences";
import { KANBAN_PAGE_SIZE, useKanbanColumn, useMoveApplication } from "@/features/kanban/useKanbanData";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { cn } from "@/lib/utils";

const closedStatuses: ApplicationStatus[] = ["Accepted", "Rejected"];
const OLD_CLOSED_DAYS = 30;
/** Abgeschlossene Spalten mit mehr Karten starten eingeklappt, solange nichts eingestellt wurde. */
const AUTO_COLLAPSE_THRESHOLD = 25;

const sortLabels: Record<BoardSort, string> = {
  updated: "Zuletzt geändert",
  applied: "Bewerbungsdatum",
  company: "Firma A–Z",
};

function isFuture(value: string | null | undefined) {
  return value != null && new Date(value).getTime() > Date.now();
}

export function KanbanPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [preferences, updatePreferences] = useBoardPreferences();
  const [dragging, setDragging] = useState<ApplicationListItem | null>(null);
  const [dropTarget, setDropTarget] = useState<ApplicationStatus | null>(null);
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const move = useMoveApplication(debouncedSearch, preferences.sort);

  const collapsed =
    preferences.collapsed ??
    closedStatuses.filter((status) => (summary.data?.byStatus[status] ?? 0) > AUTO_COLLAPSE_THRESHOLD);

  function toggleColumn(status: ApplicationStatus) {
    updatePreferences({
      collapsed: collapsed.includes(status) ? collapsed.filter((entry) => entry !== status) : [...collapsed, status],
    });
  }

  function moveTo(item: ApplicationListItem, status: ApplicationStatus) {
    if (item.status !== status) {
      move.mutate({ item, status });
    }
  }

  function dropHandlers(status: ApplicationStatus) {
    return {
      onDragOver: (event: DragEvent) => {
        if (!dragging) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (dropTarget !== status) setDropTarget(status);
      },
      onDragLeave: (event: DragEvent) => {
        // Wechsel auf ein Kindelement ist kein Verlassen der Spalte; sonst flackert die Markierung.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDropTarget((current) => (current === status ? null : current));
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        if (dragging) moveTo(dragging, status);
        setDragging(null);
        setDropTarget(null);
      },
    };
  }

  const activeCount = summary.data
    ? (["Applied", "Interview", "Offer"] as ApplicationStatus[]).reduce((sum, status) => sum + (summary.data.byStatus[status] ?? 0), 0)
    : null;

  return (
    <>
      <PageHeader
        icon={KanbanSquare}
        title="Kanban-Board"
        description="Ziehe Karten zwischen die Spalten oder ändere den Status direkt auf der Karte."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ViewSwitch current="board" search={search} />
            <Link to="/bewerbungen/neu">
              <Button>
                <Plus className="h-4 w-4" />
                Neue Bewerbung
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-9" placeholder="Firma, Titel, Technologie…" aria-label="Board durchsuchen" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="w-44">
          <Select aria-label="Sortierung" value={preferences.sort} onChange={(event) => updatePreferences({ sort: event.target.value as BoardSort })}>
            {(Object.keys(sortLabels) as BoardSort[]).map((sort) => (
              <option key={sort} value={sort}>
                {sortLabels[sort]}
              </option>
            ))}
          </Select>
        </div>

        <DensityToggle value={preferences.density} onChange={(density) => updatePreferences({ density })} />

        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-primary)]"
            checked={preferences.hideOldClosed}
            onChange={(event) => updatePreferences({ hideOldClosed: event.target.checked })}
          />
          Alte Abschlüsse ausblenden
        </label>

        {activeCount != null ? (
          <p className="text-sm text-muted-foreground lg:ml-auto">
            <span className="font-medium tabular-nums text-foreground">{activeCount}</span> laufend ·{" "}
            <span className="tabular-nums">{summary.data?.total}</span> gesamt
          </p>
        ) : null}
      </div>

      {move.isError ? (
        <Alert tone="error" className="mb-4">
          Der Status konnte nicht geändert werden. Die Karte steht wieder an ihrem alten Platz.
        </Alert>
      ) : null}

      <div className="-mx-1 flex snap-x items-start gap-3 overflow-x-auto px-1 pb-4">
        {applicationStatusOrder.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            search={debouncedSearch}
            sort={preferences.sort}
            density={preferences.density}
            hideOld={preferences.hideOldClosed && closedStatuses.includes(status)}
            collapsed={collapsed.includes(status)}
            dragging={dragging}
            isTarget={dragging != null && dropTarget === status && dragging.status !== status}
            onToggle={() => toggleColumn(status)}
            onShowOld={() => updatePreferences({ hideOldClosed: false })}
            onDragStart={setDragging}
            onDragEnd={() => {
              setDragging(null);
              setDropTarget(null);
            }}
            onMove={moveTo}
            {...dropHandlers(status)}
          />
        ))}
      </div>
    </>
  );
}

function DensityToggle({ value, onChange }: { value: CardDensity; onChange: (value: CardDensity) => void }) {
  const options = [
    { value: "compact", label: "Kompakt", icon: Rows4 },
    { value: "detailed", label: "Detail", icon: Rows3 },
  ] as const;

  return (
    <div role="radiogroup" aria-label="Kartengröße" className="inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface BoardColumnProps {
  status: ApplicationStatus;
  search: string;
  sort: BoardSort;
  density: CardDensity;
  hideOld: boolean;
  collapsed: boolean;
  dragging: ApplicationListItem | null;
  isTarget: boolean;
  onToggle: () => void;
  onShowOld: () => void;
  onDragStart: (item: ApplicationListItem) => void;
  onDragEnd: () => void;
  onMove: (item: ApplicationListItem, status: ApplicationStatus) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
}

function BoardColumn({
  status,
  search,
  sort,
  density,
  hideOld,
  collapsed,
  dragging,
  isTarget,
  onToggle,
  onShowOld,
  onDragStart,
  onDragEnd,
  onMove,
  ...dropHandlers
}: BoardColumnProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const { query, items, total } = useKanbanColumn(status, search, sort);

  // Alte Abschluesse ausblenden. Bei Sortierung nach letzter Aenderung sind alle noch nicht
  // geladenen Karten nach der ersten alten Karte ebenfalls alt, daher ist die Zahl dann exakt.
  const cutoff = Date.now() - OLD_CLOSED_DAYS * 24 * 60 * 60 * 1000;
  const visible = hideOld ? items.filter((item) => new Date(item.updatedAt).getTime() >= cutoff) : items;
  const hiddenLoaded = items.length - visible.length;
  const restIsOld = hideOld && sort === "updated" && hiddenLoaded > 0;
  const hiddenCount = restIsOld ? total - visible.length : hiddenLoaded;
  const remaining = total - items.length;
  const canLoadMore = query.hasNextPage && !restIsOld;

  const targetStyle = isTarget
    ? { boxShadow: `0 0 0 2px ${config.colorVar}`, background: `color-mix(in oklab, ${config.colorVar} 8%, var(--color-muted))` }
    : undefined;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Spalte ${config.label} ausklappen, ${total} Bewerbungen`}
        className="flex min-h-72 w-11 shrink-0 flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 py-3 transition-colors hover:bg-muted"
        style={targetStyle}
        {...dropHandlers}
      >
        <ChevronsLeftRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Icon className="h-4 w-4" style={{ color: config.colorVar }} aria-hidden="true" />
        <span className="rounded-full bg-card px-1.5 py-0.5 text-xs font-medium tabular-nums">{total}</span>
        <span className="text-sm font-semibold [writing-mode:vertical-rl]">{config.label}</span>
      </button>
    );
  }

  // Leere Spalten bleiben schmal, werden beim Ziehen aber breit genug zum Ablegen.
  const narrow = total === 0 && !query.isPending && dragging == null;

  return (
    <section
      aria-label={`${config.label}, ${total} Bewerbungen`}
      className={cn(
        "flex shrink-0 snap-start flex-col rounded-xl border border-border bg-muted/40 transition-[width,background-color,box-shadow]",
        narrow ? "w-52" : "w-72",
      )}
      style={targetStyle}
      {...dropHandlers}
    >
      <header className="flex items-center gap-2 px-3 pt-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${config.colorVar} 16%, transparent)` }}>
          <Icon className="h-4 w-4" style={{ color: config.colorVar }} aria-hidden="true" />
        </span>
        <h2 className="truncate text-sm font-semibold">{config.label}</h2>
        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums shadow-xs">{query.isPending ? "…" : total}</span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Spalte ${config.label} einklappen`}
          className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground"
        >
          <ChevronsRightLeft className="h-4 w-4" />
        </button>
      </header>
      <div className="mx-3 mb-2 mt-2.5 h-0.5 rounded-full" style={{ background: config.colorVar }} aria-hidden="true" />

      <div className={cn("flex max-h-[calc(100vh-17rem)] flex-col overflow-y-auto px-2 pb-2", density === "compact" ? "gap-1.5" : "gap-2")}>
        {query.isPending ? (
          <>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </>
        ) : query.isError ? (
          <p className="px-1 py-4 text-xs text-destructive">Spalte konnte nicht geladen werden.</p>
        ) : (
          visible.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              density={density}
              isDragging={dragging?.id === item.id}
              onDragStart={() => onDragStart(item)}
              onDragEnd={onDragEnd}
              onMove={onMove}
            />
          ))
        )}

        {isTarget ? (
          <div className="rounded-lg border-2 border-dashed px-3 py-5 text-center text-xs font-medium" style={{ borderColor: config.colorVar }}>
            Hier ablegen
          </div>
        ) : !query.isPending && visible.length === 0 && hiddenCount === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
            {search ? "Keine Treffer" : "Keine Bewerbungen"}
          </p>
        ) : null}

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={onShowOld}
            className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            {hiddenCount} älter als {OLD_CLOSED_DAYS} Tage · einblenden
          </button>
        ) : null}

        {canLoadMore ? (
          <Button variant="ghost" size="sm" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            <ChevronDown className="h-4 w-4" />
            Weitere {Math.min(KANBAN_PAGE_SIZE, remaining)} laden (noch {remaining})
          </Button>
        ) : null}

        {status === "Draft" && !search ? (
          <Link
            to="/bewerbungen/neu"
            className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Entwurf anlegen
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function StatusMenu({ item, onMove, className }: { item: ApplicationListItem; onMove: BoardColumnProps["onMove"]; className?: string }) {
  return (
    <select
      aria-label={`Status von ${item.jobTitle} ändern`}
      className={cn(
        "h-7 max-w-[8.5rem] cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 text-xs text-muted-foreground hover:border-input hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
        className,
      )}
      value={item.status}
      onChange={(event) => onMove(item, event.target.value as ApplicationStatus)}
    >
      {applicationStatusOrder.map((status) => (
        <option key={status} value={status}>
          {statusConfig[status].label}
        </option>
      ))}
    </select>
  );
}

function KanbanCard({
  item,
  density,
  isDragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  item: ApplicationListItem;
  density: CardDensity;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: BoardColumnProps["onMove"];
}) {
  const config = statusConfig[item.status];
  const upcoming = isFuture(item.interviewAt);
  const initial = item.companyName.trim().charAt(0).toUpperCase() || "?";

  const dragProps = {
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
      onDragStart();
    },
    onDragEnd,
  };

  if (density === "compact") {
    return (
      <article
        {...dragProps}
        className={cn(
          "group relative flex cursor-grab items-center gap-2 overflow-hidden rounded-lg border border-border bg-card py-1.5 pl-3 pr-1 shadow-xs transition-[box-shadow,opacity] hover:shadow-card active:cursor-grabbing",
          isDragging && "opacity-40",
        )}
      >
        <span className="absolute inset-y-0 left-0 w-0.5" style={{ background: config.colorVar }} aria-hidden="true" />
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold"
          style={{ background: `color-mix(in oklab, ${config.colorVar} 14%, transparent)`, color: config.colorVar }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <Link to={`/bewerbungen/${item.id}`} draggable={false} className="block truncate text-sm font-medium leading-tight hover:text-primary">
            {item.jobTitle}
          </Link>
          <p className="truncate text-xs leading-tight text-muted-foreground">{item.companyName}</p>
        </div>
        {upcoming ? (
          <span title={`Gespräch: ${formatDateTime(item.interviewAt)}`} className="shrink-0 text-primary">
            <CalendarClock className="h-3.5 w-3.5" aria-label={`Gespräch am ${formatDateTime(item.interviewAt)}`} />
          </span>
        ) : null}
        <StatusMenu item={item} onMove={onMove} className="shrink-0 sm:w-6 sm:px-0 sm:opacity-0 sm:focus-visible:w-auto sm:focus-visible:opacity-100 sm:group-hover:w-auto sm:group-hover:opacity-100" />
      </article>
    );
  }

  const meta = [item.location, item.workModel !== "Unspecified" ? workModelLabels[item.workModel] : null].filter(Boolean).join(" · ");

  return (
    <article
      {...dragProps}
      className={cn(
        "relative cursor-grab overflow-hidden rounded-lg border border-border bg-card p-3 pl-4 shadow-card transition-[box-shadow,transform,opacity] hover:-translate-y-px hover:shadow-md active:cursor-grabbing",
        isDragging && "rotate-1 opacity-40",
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: config.colorVar }} aria-hidden="true" />
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold"
          style={{ background: `color-mix(in oklab, ${config.colorVar} 14%, transparent)`, color: config.colorVar }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <Link className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary" to={`/bewerbungen/${item.id}`} draggable={false}>
            {item.jobTitle}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{item.companyName}</p>
        </div>
      </div>

      {meta ? (
        <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          {meta}
        </p>
      ) : null}

      {upcoming ? (
        <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary-text">
          <CalendarClock className="h-3 w-3" aria-hidden="true" />
          {formatDateTime(item.interviewAt)}
        </p>
      ) : null}

      {item.technologies.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.technologies.slice(0, 3).map((tech) => (
            <span key={tech} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {tech}
            </span>
          ))}
          {item.technologies.length > 3 ? <span className="px-1 text-[11px] text-muted-foreground">+{item.technologies.length - 3}</span> : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="truncate text-[11px] text-muted-foreground">{formatRelative(item.updatedAt)}</span>
        <StatusMenu item={item} onMove={onMove} />
      </div>
    </article>
  );
}
