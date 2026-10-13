import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { changeStatus, getApplications, getStatusLabel, type ApplicationListItem, type ApplicationStatus } from "@/features/applications/api";

const columns: ApplicationStatus[] = ["Draft", "Applied", "Interview", "Offer", "Accepted", "Rejected"];
const columnColors: Record<ApplicationStatus, string> = {
  Draft: "bg-muted", Applied: "bg-primary/10", Interview: "bg-warning/10", Offer: "bg-success/10", Accepted: "bg-success/20", Rejected: "bg-destructive/10",
};

export function KanbanPage() {
  const queryClient = useQueryClient();
  const applications = useQuery({ queryKey: ["applications", "", "", 1], queryFn: () => getApplications({ search: "", status: "", page: 1 }) });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => changeStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
  const [dragging, setDragging] = useState<string | null>(null);

  function handleDragStart(event: React.DragEvent, id: string) {
    setDragging(id);
    event.dataTransfer.setData("text/plain", id);
  }

  function handleDrop(event: React.DragEvent, status: ApplicationStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id && applications.data) {
      const item = applications.data.items.find((application) => application.id === id);
      if (item && item.status !== status) {
        mutation.mutate({ id, status });
      }
    }
    setDragging(null);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  const grouped = applications.data?.items.reduce<Record<ApplicationStatus, ApplicationListItem[]>>((acc, item) => {
    (acc[item.status] = acc[item.status] || []).push(item);
    return acc;
  }, {} as Record<ApplicationStatus, ApplicationListItem[]>) ?? ({} as Record<ApplicationStatus, ApplicationListItem[]>);

  return (
    <>
      <PageHeader title="Kanban-Board" description="Verschieben Sie Bewerbungen per Drag-and-drop zwischen den Status." />
      {applications.isPending ? <p className="text-sm text-muted-foreground">Wird geladen...</p> : applications.isError ? <p className="text-sm text-destructive">Fehler beim Laden.</p> : (
        <div className="grid gap-4 overflow-x-auto pb-4 lg:grid-cols-6">
          {columns.map((status) => (
            <div key={status} className="min-w-48" onDrop={(event) => handleDrop(event, status)} onDragOver={handleDragOver}>
              <div className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${columnColors[status]}`}>{getStatusLabel(status)} ({grouped[status]?.length ?? 0})</div>
              <div className="min-h-64 space-y-2 rounded-b-lg border border-t-0 border-border bg-card p-2">
                {(grouped[status] ?? []).map((item) => (
                  <Card key={item.id} draggable onDragStart={(event) => handleDragStart(event, item.id)} className={`cursor-grab ${dragging === item.id ? "opacity-50" : ""}`}>
                    <CardBody className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <Link className="block truncate text-sm font-medium hover:text-primary" to={`/bewerbungen/${item.id}`}>{item.jobTitle}</Link>
                          <p className="truncate text-xs text-muted-foreground">{item.companyName}</p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}