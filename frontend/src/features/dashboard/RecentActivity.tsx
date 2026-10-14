import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, History, Plus } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getApplications } from "@/features/applications/api";
import { formatRelative } from "@/lib/format";

export function RecentActivity() {
  const recent = useQuery({
    queryKey: ["applications", "recent"],
    queryFn: () => getApplications({ search: "", status: "", page: 1, pageSize: 5 }),
  });

  return (
    <Card>
      <CardHeader
        icon={History}
        title="Letzte Aktivität"
        action={
          <Link to="/bewerbungen">
            <Button variant="ghost" size="sm">
              Alle anzeigen <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        }
      />
      <CardBody className="p-0">
        {recent.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : recent.isError ? (
          <div className="p-4">
            <Alert tone="error">Die letzten Aktivitäten konnten nicht geladen werden.</Alert>
          </div>
        ) : recent.data.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Briefcase}
              title="Noch keine Bewerbungen"
              description="Lege deine erste Bewerbung an, um hier deine Aktivitäten zu sehen."
              action={
                <Link to="/bewerbungen/neu">
                  <Button>
                    <Plus className="mr-1 h-4 w-4" /> Neue Bewerbung
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.data.items.map((application) => (
              <li key={application.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link className="block truncate font-medium hover:text-primary" to={`/bewerbungen/${application.id}`}>
                    {application.jobTitle}
                  </Link>
                  <span className="text-xs text-muted-foreground">{application.companyName}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ApplicationStatusBadge status={application.status} size="sm" />
                  <span className="text-xs text-muted-foreground">aktualisiert {formatRelative(application.updatedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
