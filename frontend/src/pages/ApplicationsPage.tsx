import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { deleteApplication, getApplications, applicationStatuses, type ApplicationStatus } from "@/features/applications/api";
import { ApiError } from "@/lib/api";


export function ApplicationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const applications = useQuery({ queryKey: ["applications", search, status, page], queryFn: () => getApplications({ search, status, page }) });
  const remove = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  async function handleDelete(id: string, name: string) {
    if (window.confirm(`Bewerbung bei ${name} wirklich löschen?`)) {
      try { await remove.mutateAsync(id); } catch (error) { window.alert(error instanceof ApiError ? error.message : "Löschen fehlgeschlagen."); }
    }
  }

  return (
    <>
      <PageHeader title="Meine Bewerbungen" description="Verwalten Sie Ihre Bewerbungen zentral und behalten Sie den Fortschritt im Blick." action={<Link to="/bewerbungen/neu"><Button><Plus className="h-4 w-4" />Neue Bewerbung</Button></Link>} />
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><input className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" placeholder="Firma, Jobtitel, Ort oder Technologie suchen..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
            <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value as ApplicationStatus | ""); setPage(1); }}>
              <option value="">Alle Status</option>{applicationStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {applications.isPending ? <p className="py-8 text-center text-sm text-muted-foreground">Bewerbungen werden geladen...</p> : applications.isError ? <p className="py-8 text-center text-sm text-destructive">Die Bewerbungen konnten nicht geladen werden.</p> : applications.data.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Noch keine passenden Bewerbungen vorhanden.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-3 font-medium">Position</th><th className="px-3 py-3 font-medium">Ort</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Beworben am</th><th className="px-3 py-3" /></tr></thead><tbody className="divide-y divide-border">{applications.data.items.map((application) => <tr key={application.id} className="hover:bg-accent/50"><td className="px-3 py-3"><Link className="font-medium hover:text-primary" to={`/bewerbungen/${application.id}`}>{application.jobTitle}</Link><div className="text-xs text-muted-foreground">{application.companyName}</div></td><td className="px-3 py-3 text-muted-foreground">{application.location || "—"}</td><td className="px-3 py-3"><ApplicationStatusBadge status={application.status} /></td><td className="px-3 py-3 text-muted-foreground">{application.appliedOn ? new Date(application.appliedOn).toLocaleDateString("de-DE") : "—"}</td><td className="px-3 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => void handleDelete(application.id, application.companyName)} aria-label="Bewerbung löschen"><Trash2 className="h-4 w-4 text-destructive" /></Button></td></tr>)}</tbody></table></div>}
          {applications.data && applications.data.totalPages > 1 ? <div className="flex items-center justify-between border-t border-border pt-4 text-sm"><span className="text-muted-foreground">Seite {applications.data.page} von {applications.data.totalPages}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={!applications.data.hasPreviousPage} onClick={() => setPage((value) => value - 1)}>Zurück</Button><Button variant="secondary" size="sm" disabled={!applications.data.hasNextPage} onClick={() => setPage((value) => value + 1)}>Weiter</Button></div></div> : null}
        </CardBody>
      </Card>
    </>
  );
}
