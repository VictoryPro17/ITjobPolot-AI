import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, Clock, MessagesSquare, PieChart } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { getSummary, type ApplicationSummary } from "@/features/applications/api";
import { applicationStatusOrder, statusConfig } from "@/features/applications/status";

export function DashboardSummary() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });

  if (summary.isPending) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (summary.isError || !summary.data) {
    return <Alert tone="error">Die Übersicht konnte nicht geladen werden.</Alert>;
  }

  const data = summary.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Briefcase} label="Bewerbungen" value={String(data.total)} hint={`+${data.thisMonth} diesen Monat`} />
        <StatTile icon={Clock} label="Offen" value={String(data.open)} hint="warten auf Rückmeldung oder laufen" />
        <StatTile icon={MessagesSquare} label="Gespräche" value={String(data.interviews)} hint="aktuell im Gesprächsstatus" />
        <StatTile icon={CheckCircle2} label="Zusagen" value={String(data.accepted)} hint={`${data.rejected} Absagen`} />
      </div>
      {data.total > 0 ? <StatusBar data={data} /> : null}
    </div>
  );
}

/** Gestapelte Leiste der aktuellen Status mit Legende; jede Legende verlinkt auf die gefilterte Liste. */
function StatusBar({ data }: { data: ApplicationSummary }) {
  const segments = applicationStatusOrder
    .map((status) => ({ status, count: data.byStatus[status] ?? 0 }))
    .filter((segment) => segment.count > 0);
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <Card>
      <CardHeader icon={PieChart} title="Statusübersicht" description="Wo deine Bewerbungen gerade stehen." />
      <CardBody className="space-y-4">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-card" aria-hidden="true">
          {segments.map((segment) => (
            <div
              key={segment.status}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(segment.count / total) * 100}%`, background: statusConfig[segment.status].colorVar }}
              title={`${statusConfig[segment.status].label}: ${segment.count}`}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {applicationStatusOrder.map((status) => {
            const count = data.byStatus[status] ?? 0;
            return (
              <li key={status}>
                <Link to={`/bewerbungen?status=${status}`} className="inline-flex items-center gap-2 rounded-md hover:text-primary">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusConfig[status].colorVar }} aria-hidden="true" />
                  {statusConfig[status].label}
                  <span className="font-medium tabular-nums">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
