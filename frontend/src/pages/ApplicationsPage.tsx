import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, CalendarClock, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  deleteApplication,
  getApplications,
  getSummary,
  workModelLabels,
  type ApplicationListItem,
  type ApplicationStatus,
} from "@/features/applications/api";
import { applicationStatusOrder, statusConfig } from "@/features/applications/status";
import { ViewSwitch } from "@/features/applications/ViewSwitch";
import { ApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

function parseStatus(value: string | null): ApplicationStatus | "" {
  return applicationStatusOrder.find((status) => status === value) ?? "";
}

function isFuture(value: string | null | undefined) {
  return value != null && new Date(value).getTime() > Date.now();
}

function StatusFilterChips({
  value,
  counts,
  total,
  onChange,
}: {
  value: ApplicationStatus | "";
  counts?: Record<ApplicationStatus, number>;
  total?: number;
  onChange: (status: ApplicationStatus | "") => void;
}) {
  const chipClass = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
      active ? "border-primary bg-primary/10 font-medium text-primary" : "border-border bg-card hover:bg-accent/50",
    );

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Nach Status filtern">
      <button type="button" aria-pressed={value === ""} className={chipClass(value === "")} onClick={() => onChange("")}>
        Alle{total != null ? ` (${total})` : ""}
      </button>
      {applicationStatusOrder.map((status) => (
        <button
          key={status}
          type="button"
          aria-pressed={value === status}
          className={chipClass(value === status)}
          onClick={() => onChange(status)}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: statusConfig[status].colorVar }} aria-hidden="true" />
          {statusConfig[status].label}
          {counts ? <span className="text-xs tabular-nums text-muted-foreground">{counts[status] ?? 0}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Technologies({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">–</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.slice(0, 3).map((tech) => (
        <Badge key={tech} tone="neutral">
          {tech}
        </Badge>
      ))}
      {items.length > 3 ? <span className="text-xs text-muted-foreground">+{items.length - 3}</span> : null}
    </div>
  );
}

function InterviewText({ value }: { value: string | null }) {
  if (value == null) return <span className="text-muted-foreground">–</span>;
  return <span className={isFuture(value) ? "font-medium text-primary" : "text-muted-foreground"}>{formatDateTime(value)}</span>;
}

function workModelText(item: ApplicationListItem) {
  return item.workModel !== "Unspecified" ? workModelLabels[item.workModel] : null;
}

function RowActions({ item, onDelete }: { item: ApplicationListItem; onDelete: (item: ApplicationListItem) => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Link
        to={`/bewerbungen/${item.id}/bearbeiten`}
        aria-label="Bearbeiten"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <Button variant="ghost" size="icon" aria-label="Löschen" onClick={() => onDelete(item)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function ApplicationRow({ item, onDelete }: { item: ApplicationListItem; onDelete: (item: ApplicationListItem) => void }) {
  const workModel = workModelText(item);
  return (
    <tr className="border-b border-border last:border-0 hover:bg-accent/50">
      <td className="px-4 py-3">
        <Link className="font-medium hover:text-primary" to={`/bewerbungen/${item.id}`}>
          {item.jobTitle}
        </Link>
        <p className="text-xs text-muted-foreground">{item.companyName}</p>
      </td>
      <td className="px-4 py-3">
        <p>{item.location || "–"}</p>
        {workModel ? <p className="text-xs text-muted-foreground">{workModel}</p> : null}
      </td>
      <td className="px-4 py-3">
        <ApplicationStatusBadge status={item.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">{formatDate(item.appliedOn)}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <InterviewText value={item.interviewAt} />
      </td>
      <td className="px-4 py-3">
        <Technologies items={item.technologies} />
      </td>
      <td className="px-4 py-3">
        <RowActions item={item} onDelete={onDelete} />
      </td>
    </tr>
  );
}

function ApplicationCard({ item, onDelete }: { item: ApplicationListItem; onDelete: (item: ApplicationListItem) => void }) {
  const workModel = workModelText(item);
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link className="block truncate font-medium hover:text-primary" to={`/bewerbungen/${item.id}`}>
            {item.jobTitle}
          </Link>
          <p className="truncate text-sm text-muted-foreground">{item.companyName}</p>
        </div>
        <ApplicationStatusBadge status={item.status} size="sm" />
      </div>
      <p className="text-xs text-muted-foreground">
        {[item.location, workModel].filter(Boolean).join(" · ") || "–"} · Beworben: {formatDate(item.appliedOn)}
      </p>
      {item.interviewAt != null ? (
        <p className="flex items-center gap-1 text-xs">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          <InterviewText value={item.interviewAt} />
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Technologies items={item.technologies} />
        <RowActions item={item} onDelete={onDelete} />
      </div>
    </Card>
  );
}

export function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ApplicationListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => setPage(1), [debouncedSearch]);

  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const applications = useQuery({
    queryKey: ["applications", debouncedSearch, status, page],
    queryFn: () => getApplications({ search: debouncedSearch, status, page }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      setToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
    onError: (error) => {
      setToDelete(null);
      setDeleteError(error instanceof ApiError ? error.message : "Die Bewerbung konnte nicht gelöscht werden.");
    },
  });

  function changeStatusFilter(next: ApplicationStatus | "") {
    setSearchParams(next ? { status: next } : {}, { replace: true });
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    changeStatusFilter("");
  }

  // Wurde der letzte Eintrag einer Seite geloescht, auf die letzte vorhandene Seite springen.
  const totalPages = applications.data?.totalPages;
  useEffect(() => {
    if (totalPages != null && totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const items = applications.data?.items ?? [];
  const filtersActive = debouncedSearch !== "" || status !== "";

  return (
    <>
      <PageHeader
        icon={Briefcase}
        title="Meine Bewerbungen"
        description="Behalte den Überblick über alle deine Bewerbungen, suche gezielt und filtere nach Status."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ViewSwitch current="list" search={search} />
            <Link to="/bewerbungen/neu">
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Neue Bewerbung
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        <StatusFilterChips value={status} counts={summary.data?.byStatus} total={summary.data?.total} onChange={changeStatusFilter} />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Nach Position, Firma oder Ort suchen"
            aria-label="Bewerbungen durchsuchen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {deleteError ? <Alert tone="error">{deleteError}</Alert> : null}

        {applications.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : applications.isError ? (
          <Alert tone="error">Die Bewerbungen konnten nicht geladen werden.</Alert>
        ) : items.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="Keine Treffer"
              description="Zu deiner Suche oder deinem Filter gibt es keine Bewerbungen."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Filter zurücksetzen
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="Noch keine Bewerbungen"
              description="Lege deine erste Bewerbung an und behalte sie im Blick."
              action={
                <Link to="/bewerbungen/neu">
                  <Button>
                    <Plus className="mr-1 h-4 w-4" /> Neue Bewerbung
                  </Button>
                </Link>
              }
            />
          )
        ) : (
          <>
            <Card className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Position", "Ort", "Status", "Beworben", "Gespräch", "Technologien"].map((label) => (
                      <th key={label} className="px-4 py-2 font-medium">
                        {label}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-right font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <ApplicationRow key={item.id} item={item} onDelete={setToDelete} />
                  ))}
                </tbody>
              </table>
            </Card>
            <div className="space-y-2 md:hidden">
              {items.map((item) => (
                <ApplicationCard key={item.id} item={item} onDelete={setToDelete} />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{applications.data?.totalCount ?? 0} Bewerbungen</p>
              <Pagination page={page} totalPages={applications.data?.totalPages ?? 1} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={toDelete != null}
        title="Bewerbung löschen?"
        description={
          toDelete
            ? `Die Bewerbung als ${toDelete.jobTitle} bei ${toDelete.companyName} wird endgültig gelöscht. Das kann nicht rückgängig gemacht werden.`
            : ""
        }
        confirmLabel="Löschen"
        tone="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (toDelete) {
            setDeleteError(null);
            remove.mutate(toDelete.id);
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
