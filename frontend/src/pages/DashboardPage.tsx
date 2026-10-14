import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, KanbanSquare, LayoutDashboard, Plus, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { DashboardSummary } from "@/features/dashboard/DashboardSummary";
import { RecentActivity } from "@/features/dashboard/RecentActivity";
import { UpcomingInterviews } from "@/features/dashboard/UpcomingInterviews";
import { getUpcomingReminders } from "@/features/reminders/api";
import { formatDateTime } from "@/lib/format";

function greeting(hour: number) {
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Hallo";
  return "Guten Abend";
}

export function DashboardPage() {
  const { user } = useAuth();
  const upcoming = useQuery({ queryKey: ["reminders", "upcoming"], queryFn: () => getUpcomingReminders(5) });
  const name = user?.firstName?.trim();

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title={name ? `${greeting(new Date().getHours())}, ${name}` : "Dashboard"}
        description="Dein Überblick über Bewerbungen, Termine und Fortschritt."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/ki-assistent">
              <Button variant="secondary">
                <Sparkles className="h-4 w-4" />
                KI-Analyse
              </Button>
            </Link>
            <Link to="/board">
              <Button variant="secondary">
                <KanbanSquare className="h-4 w-4" />
                Board
              </Button>
            </Link>
            <Link to="/bewerbungen/neu">
              <Button>
                <Plus className="h-4 w-4" />
                Neue Bewerbung
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        <DashboardSummary />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RecentActivity />
          </div>
          <div className="space-y-6">
            <UpcomingInterviews />

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
                ) : upcoming.isError ? (
                  <Alert tone="error">Die Erinnerungen konnten nicht geladen werden.</Alert>
                ) : upcoming.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine anstehenden Erinnerungen.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {upcoming.data.map((reminder) => (
                      <li key={reminder.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(reminder.dueAt)}</p>
                        </div>
                        {reminder.isOverdue ? <Badge tone="danger">Überfällig</Badge> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
