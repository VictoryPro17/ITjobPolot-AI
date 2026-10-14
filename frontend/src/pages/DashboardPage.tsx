import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DashboardSummary } from "@/features/dashboard/DashboardSummary";
import { RecentActivity } from "@/features/dashboard/RecentActivity";
import { getUpcomingReminders } from "@/features/reminders/api";

export function DashboardPage() {
  const upcoming = useQuery({ queryKey: ["reminders", "upcoming"], queryFn: () => getUpcomingReminders(5) });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Überblick über Ihre Bewerbungen und den Fortschritt."
      />

      <div className="space-y-6">
        <DashboardSummary />
        <RecentActivity />

        <Card>
          <CardHeader
            icon={Bell}
            title="Nächste Erinnerungen"
            action={
              <Link to="/erinnerungen" className="text-sm font-medium text-primary hover:underline">
                Alle anzeigen
              </Link>
            }
          />
          <CardBody>
            {upcoming.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : !upcoming.data || upcoming.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine anstehenden Erinnerungen.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.data.map((reminder) => (
                  <li key={reminder.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{reminder.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reminder.dueAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    {reminder.isOverdue ? <Badge tone="danger">Überfällig</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
