import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { BarChart3, CalendarDays, Filter, PieChart as PieChartIcon, Target, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { getStatistics, type ApplicationStatus, type MonthlyStats } from "@/features/applications/api";

const monthNames = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const funnelColors = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981"];

const statusChartLabels: Record<ApplicationStatus, string> = {
  Draft: "Entwurf",
  Applied: "Beworben",
  Interview: "Gespräch",
  Offer: "Angebot",
  Accepted: "Zusage",
  Rejected: "Absage",
};

const statusColors: Record<ApplicationStatus, string> = {
  Draft: "#94a3b8",
  Applied: "#6366f1",
  Interview: "#0ea5e9",
  Offer: "#f59e0b",
  Accepted: "#10b981",
  Rejected: "#ef4444",
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--card-foreground)",
};

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
        <PageHeader icon={BarChart3} title="Statistiken" description="Auswertungen zu Bewerbungsquoten und Verlaeufen." />
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
        <PageHeader icon={BarChart3} title="Statistiken" description="Auswertungen zu Bewerbungsquoten und Verlaeufen." />
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

  const weekly = data.weeklyActivity.map((week) => {
    const [, month, day] = week.weekStart.split("-");
    return { name: `${day}.${month}.`, Bewerbungen: week.applied };
  });

  const statusData = data.statusDistribution
    .filter((entry) => entry.count > 0)
    .map((entry) => ({ status: entry.status, name: statusChartLabels[entry.status], value: entry.count }));

  const progressRows = [
    { label: "Beworben", value: data.totalApplications, tone: "primary" as const },
    { label: "Gespräch", value: data.totalInterviews, tone: "primary" as const },
    { label: "Angebot", value: data.totalOffers, tone: "primary" as const },
    { label: "Zusage", value: data.totalAccepted, tone: "success" as const },
  ];

  return (
    <>
      <PageHeader icon={BarChart3} title="Statistiken" description="Auswertungen zu Bewerbungsquoten und Verlaeufen." />

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

          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Letzte 30 Tage" value={String(data.applicationsLast30Days)} hint="Bewerbungen" />
            <Metric
              label="Ø Antwortzeit"
              value={data.averageDaysToResponse == null ? "–" : `${data.averageDaysToResponse.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Tage`}
            />
            <Metric
              label="Ø Match-Score"
              value={data.averageMatchScore == null ? "–" : `${data.averageMatchScore.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`}
            />
          </div>

          <Card>
            <CardHeader icon={TrendingUp} title="Monatsverlauf" description="Bewerbungen und Fortschritt je Monat." />
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
              <CardHeader icon={Target} title="Bewerbungstrichter" description="Verteilung nach weitestem erreichtem Schritt." />
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

          <Card>
            <CardHeader icon={Filter} title="Bewerbungsfortschritt" description="Anteil der Bewerbungen je Schritt." />
            <CardBody className="space-y-4">
              {progressRows.map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.label}</span>
                    <span className="tabular-nums text-muted-foreground">{row.value}</span>
                  </div>
                  <Progress
                    value={data.totalApplications > 0 ? (row.value / data.totalApplications) * 100 : 0}
                    tone={row.tone}
                  />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={CalendarDays} title="Aktivität (12 Wochen)" description="Bewerbungen je Kalenderwoche." />
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="Bewerbungen" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={PieChartIcon} title="Statusverteilung" description="Bewerbungen nach aktuellem Status." />
            <CardBody>
              {statusData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Daten vorhanden.</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%">
                        {statusData.map((entry) => (
                          <Cell key={entry.status} fill={statusColors[entry.status]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
