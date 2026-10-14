import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, KanbanSquare } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { applicationStatuses, changeStatus, getApplications, type ApplicationStatus, type PagedApplications } from "@/features/applications/api";
import { applicationStatusOrder, statusConfig } from "@/features/applications/status";

const kanbanKey = ["applications", "kanban"] as const;

export function KanbanPage() {
  const queryClient = useQueryClient();
  const applications = useQuery({
    queryKey: kanbanKey,
    queryFn: () => getApplications({ search: "", status: "", page: 1, pageSize: 100 }),
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ApplicationStatus | null>(null);
  const [statusError, setStatusError] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => changeStatus(id, status),
    onMutate: async ({ id, status }) => {
      setStatusError(false);
      await queryClient.cancelQueries({ queryKey: kanbanKey });
      const previous = queryClient.getQueryData<PagedApplications>(kanbanKey);
      if (previous) {
        queryClient.setQueryData<PagedApplications>(kanbanKey, {
          ...previous,
          items: previous.items.map((item) => (item.id === id ? { ...item, status } : item)),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(kanbanKey, context.previous);
      }
      setStatusError(true);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  function moveTo(id: string, status: ApplicationStatus) {
    const item = applications.data?.items.find((application) => application.id === id);
    if (item && item.status !== status) {
      mutation.mutate({ id, status });
    }
  }

  function handleDragStart(event: React.DragEvent, id: string) {
    setDragging(id);
    event.dataTransfer.setData("text/plain", id);
  }

  function handleDrop(event: React.DragEvent, status: ApplicationStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id) {
      moveTo(id, status);
    }
    setDragging(null);
    setDropTarget(null);
  }

  function handleDragOver(event: React.DragEvent, status: ApplicationStatus) {
    event.preventDefault();
    setDropTarget(status);
  }

  const items = applications.data?.items ?? [];

  return (
    <>
      <PageHeader
        icon={KanbanSquare}
        title="Kanban-Board"
        description="Verschieben Sie Bewerbungen per Drag-and-drop zwischen den Status."
      />
      {statusError ? (
        <Alert tone="error" className="mb-4">
          Status konnte nicht geändert werden.
        </Alert>
      ) : null}
      {applications.isPending ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {applicationStatusOrder.map((status) => (
            <Skeleton key={status} className="h-64 w-64 shrink-0" />
          ))}
        </div>
      ) : applications.isError ? (
        <Alert tone="error">Die Bewerbungen konnten nicht geladen werden.</Alert>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {applicationStatusOrder.map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const columnItems = items.filter((item) => item.status === status);

            return (
              <div
                key={status}
                className="w-64 shrink-0"
                onDrop={(event) => handleDrop(event, status)}
                onDragOver={(event) => handleDragOver(event, status)}
                onDragLeave={() => setDropTarget((current) => (current === status ? null : current))}
              >
                <div
                  className="flex items-center gap-2 rounded-t-lg border border-b-0 border-border bg-card px-3 py-2"
                  style={{ borderTop: `3px solid ${config.colorVar}` }}
                >
                  <Icon className="h-4 w-4" style={{ color: config.colorVar }} aria-hidden="true" />
                  <span className="text-sm font-semibold">{config.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">{columnItems.length}</span>
                </div>
                <div
                  className={`min-h-64 space-y-2 rounded-b-lg border border-border bg-muted/30 p-2 ${
                    dropTarget === status && dragging ? "ring-2 ring-primary/40" : ""
                  }`}
                >
                  {columnItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Keine Bewerbungen</p>
                  ) : (
                    columnItems.map((item) => (
                      <Card
                        key={item.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, item.id)}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropTarget(null);
                        }}
                        className={`cursor-grab ${dragging === item.id ? "opacity-50" : ""}`}
                      >
                        <CardBody className="space-y-2 p-3">
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <Link className="block truncate text-sm font-medium hover:text-primary" to={`/bewerbungen/${item.id}`}>
                                {item.jobTitle}
                              </Link>
                              <p className="truncate text-xs text-muted-foreground">{item.companyName}</p>
                            </div>
                          </div>
                          <Select
                            className="h-8 text-xs"
                            aria-label="Status ändern"
                            value={item.status}
                            onChange={(event) => moveTo(item.id, event.target.value as ApplicationStatus)}
                          >
                            {applicationStatuses.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
