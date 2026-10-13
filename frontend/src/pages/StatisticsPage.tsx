import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { getStatistics, type MonthlyStats } from "@/features/applications/api";

const monthNames = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const funnelColors = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981"];

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

export function StatisticsPage() {
  const statistics = useQuery({ queryKey: ["statistics"], queryFn: getStatistics });

  if (statistics.isPending) {
    return (
      <>
        <PageHeader title="Statistiken" description="Auswertungen zu Bewerbungsquoten und Verlaeufen." />
        <Card>
          <CardBody>
            <Spinner label="Statistiken werden geladen..." />
          </CardBody>
        </Card>
      </>
    );
  }

  if (statistics.isError || !statistics.data) {
    return (
      <>
        <PageHeader title="Statistiken" description="Auswertungen zu Bewerbungsquoten und Verlaeufen." />
        <Card>
          <CardBody>
            <p className="text-sm text-destructive">Die Statistiken konnten nicht geladen werden.</p>
          </CardBody>
        </Card>
      </>
    );
  }

  const data = statistics.data;

  const monthly = data.monthlyData.map((month: MonthlyStats) => ({
    name: `${monthNames[month.month - 1]} ${String(month.year).slice(2)}`,
    Bewerbungen: month.applied,
    Gespraeche: month.interviews,
    Angebote: month.offers,
    Absagen: month.rejected,
  }));

  const funnel = [
    { name: "Beworben", value: data.totalApplications - data.totalInterviews },
    { name: "Gespraech", value: data.totalInterviews - data.totalOffers },
    { name: "Angebot", value: data.totalOffers - data.totalAccepted },
    { name: "Zusage", value: data.totalAccepted },
  ].filter((slice) => slice.value > 0);

  const percent = (value: number) => `${value.toFixed(1)} %`;

  return (
    <>
      <PageHeader title="Statistiken" description="Auswertungen zu Bewerbungsquoten und Verlaeufen." />

      {data.totalApplications === 0 ? (
        <EmptyState
          title="Noch keine Auswertung moeglich"
          description="Sobald Bewerbungen mit einem Bewerbungsdatum erfasst sind, erscheinen hier Kennzahlen und Diagramme."
        />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Bewerbungen gesamt" value={String(data.totalApplications)} hint="mit Bewerbungsdatum" />
            <Metric label="Einladungsquote" value={percent(data.interviewRate)} hint={`${data.totalInterviews} Gespraeche`} />
            <Metric label="Angebotsquote" value={percent(data.offerRate)} hint={`${data.totalOffers} Angebote`} />
            <Metric label="Zusagequote" value={percent(data.acceptanceRate)} hint={`${data.totalAccepted} Zusagen`} />
          </div>

          <Card>
            <CardHeader title="Monatsverlauf" description="Bewerbungen und Fortschritt je Monat." />
            <CardBody>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Bewerbungen" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gespraeche" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Angebote" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Absagen" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {funnel.length > 0 ? (
            <Card>
              <CardHeader title="Bewerbungstrichter" description="Verteilung nach weitestem erreichtem Schritt." />
              <CardBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={funnel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                        {funnel.map((slice, index) => (
                          <Cell key={slice.name} fill={funnelColors[index % funnelColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.75rem",
                          color: "var(--card-foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}