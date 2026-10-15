import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CalendarX } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getApplications } from "@/features/applications/api";
import { formatDateTime, formatRelative } from "@/lib/format";

/** Die naechsten Gespraechstermine aus Bewerbungen im Status "Gespraech". */
export function UpcomingInterviews() {
  const interviews = useQuery({
    queryKey: ["applications", "upcoming-interviews"],
    queryFn: () => getApplications({ search: "", status: "Interview", page: 1, pageSize: 100 }),
  });

  // Zeitpunkt einmal je Ansicht festhalten (Rendern muss rein sein).
  const [now] = useState(() => Date.now());
  const upcoming = (interviews.data?.items ?? [])
    .filter((application) => application.interviewAt != null && new Date(application.interviewAt).getTime() >= now)
    .sort((a, b) => new Date(a.interviewAt!).getTime() - new Date(b.interviewAt!).getTime())
    .slice(0, 5);
  const withoutDate = (interviews.data?.items ?? []).filter((application) => application.interviewAt == null).length;

  return (
    <Card>
      <CardHeader
        icon={CalendarClock}
        title="Anstehende Gespräche"
        action={
          <Link to="/bewerbungen?status=Interview" className="text-sm font-medium text-primary hover:underline">
            Alle anzeigen
          </Link>
        }
      />
      <CardBody>
        {interviews.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : interviews.isError ? (
          <Alert tone="error">Die Gesprächstermine konnten nicht geladen werden.</Alert>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine anstehenden Gespräche.</p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((application) => (
              <li key={application.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link to={`/bewerbungen/${application.id}`} className="block truncate text-sm font-medium hover:text-primary">
                    {application.jobTitle}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{application.companyName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-primary">{formatRelative(application.interviewAt)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(application.interviewAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {withoutDate > 0 ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarX className="h-3.5 w-3.5" aria-hidden="true" />
            {withoutDate === 1 ? "1 Gespräch hat noch keinen Termin." : `${withoutDate} Gespräche haben noch keinen Termin.`}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
