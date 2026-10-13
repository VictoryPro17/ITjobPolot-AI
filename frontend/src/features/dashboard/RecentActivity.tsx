import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getApplications, getStatusLabel, type ApplicationStatus } from "@/features/applications/api";
import { Button } from "@/components/ui/Button";

const toneByStatus: Record<ApplicationStatus, "success" | "warning" | "danger" | "neutral"> = {
  Draft: "neutral", Applied: "warning", Interview: "warning", Offer: "success", Accepted: "success", Rejected: "danger",
};

export function RecentActivity() {
  const recent = useQuery({ queryKey: ["applications", "", "", 1], queryFn: () => getApplications({ search: "", status: "", page: 1 }) });

  return (
    <Card>
      <CardHeader title="Letzte Aktivität" action={<Link to="/bewerbungen"><Button variant="ghost" size="sm">Alle anzeigen <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>} />
      <CardBody className="p-0">
        {recent.isPending ? <p className="px-5 py-6 text-sm text-muted-foreground">Wird geladen...</p> : recent.isError ? <p className="px-5 py-6 text-sm text-destructive">Fehler beim Laden.</p> : recent.data.items.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">Noch keine Bewerbungen vorhanden.</p> : (
          <ul className="divide-y divide-border">
            {recent.data.items.slice(0, 5).map((application) => (
              <li key={application.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0"><Link className="block truncate font-medium hover:text-primary" to={`/bewerbungen/${application.id}`}>{application.jobTitle}</Link><span className="text-xs text-muted-foreground">{application.companyName}</span></div>
                <StatusBadge tone={toneByStatus[application.status]}>{getStatusLabel(application.status)}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}