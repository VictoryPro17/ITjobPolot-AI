import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarCheck, CheckCircle, Clock, TrendingUp, XCircle } from "lucide-react";

import { Card, CardBody } from "@/components/ui/Card";
import { getSummary } from "@/features/applications/api";

const cards = [
  { key: "total", label: "Gesamt", icon: Briefcase, color: "text-primary" },
  { key: "thisMonth", label: "Diesen Monat", icon: CalendarCheck, color: "text-primary" },
  { key: "open", label: "Offen", icon: Clock, color: "text-warning" },
  { key: "interviews", label: "Interviews", icon: TrendingUp, color: "text-primary" },
  { key: "accepted", label: "Zusagen", icon: CheckCircle, color: "text-success" },
  { key: "rejected", label: "Absagen", icon: XCircle, color: "text-destructive" },
] as const;

export function DashboardSummary() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });

  if (summary.isPending) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{cards.map((card) => <Card key={card.key}><CardBody className="animate-pulse"><div className="h-4 w-20 rounded bg-muted" /><div className="mt-2 h-8 w-12 rounded bg-muted" /></CardBody></Card>)}</div>;
  }

  if (summary.isError || !summary.data) {
    return <p className="text-sm text-destructive">Die Zusammenfassung konnte nicht geladen werden.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = summary.data[card.key];
        return (
          <Card key={card.key}>
            <CardBody>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />{card.label}</div>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}