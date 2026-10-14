import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  MessagesSquare,
  PieChart as PieChartIcon,
  Send,
  Target,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { ChartTable } from "@/components/charts/ChartTable";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Alert } from "@/components/ui/Alert";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { getStatistics, type ApplicationStatus } from "@/features/applications/api";
import { applicationStatusOrder, statusConfig } from "@/features/applications/status";

const axisTick = { fill: "var(--chart-axis)", fontSize: 12 };

function formatNumber(value: number) {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("T")[0].split("-");
  return { short: `${day}.${month}.`, full: `${day}.${month}.${year}` };
}

function formatMonth(year: number, month: number) {
  const name = new Date(year, month - 1, 1).toLocaleDateString("de-DE", { month: "short" }).replace(".", "");
  return `${name} '${String(year).slice(2)}`;
}

const header = <PageHeader icon={BarChart3} title="Statistiken" description="Auswertungen zu Bewerbungsquoten und Verläufen." />;

export function StatisticsPage() {
  const statistics = useQuery({ queryKey: ["statistics"], queryFn: getStatistics });

  if (statistics.isPending) {
    return (
      <>
        {header}
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </>
    );
  }

  if (statistics.isError || !statistics.data) {
    return (
      <>
        {header}
        <Alert tone="error">Die Statistiken konnten nicht geladen werden.</Alert>
      </>
    );
  }

  const data = statistics.data;

  if (data.totalApplications === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={BarChart3}
          title="Noch keine Auswertung möglich"
          description="Sobald Bewerbungen mit einem Bewerbungsdatum erfasst sind, erscheinen hier Kennzahlen und Diagramme."
        />
      </>
    );
  }

  const funnel = [
    { label: "Beworben", value: data.totalApplications },
    { label: "Gespräch", value: data.totalInterviews },
    { label: "Angebot", value: data.totalOffers },
    { label: "Zusage", value: data.totalAccepted },
  ];

  const weekly = data.weeklyActivity.map((week) => {
    const date = formatDate(week.weekStart);
    return { name: date.short, full: date.full, Bewerbungen: week.applied };
  });

  const monthly = data.monthlyData.map((month) => ({
    name: formatMonth(month.year, month.month),
    Bewerbungen: month.applied,
    Gespräche: month.interviews,
    Angebote: month.offers,
    Absagen: month.rejected,
  }));

  const countByStatus = new Map<ApplicationStatus, number>(data.statusDistribution.map((entry) => [entry.status, entry.count]));
  const statusTotal = applicationStatusOrder.reduce((sum, status) => sum + (countByStatus.get(status) ?? 0), 0);
  const statusRows = applicationStatusOrder.map((status) => {
    const count = countByStatus.get(status) ?? 0;
    return { status, count, share: statusTotal > 0 ? (count / statusTotal) * 100 : 0 };
  });

  return (
    <>
      {header}

      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={Send}
            label="Bewerbungen"
            value={String(data.totalApplications)}
            hint={`+${data.applicationsLast30Days} in den letzten 30 Tagen`}
          />
          <StatTile
            icon={MessagesSquare}
            label="Gesprächsquote"
            value={`${formatNumber(data.interviewRate)} %`}
            hint={`${data.totalInterviews} Gespräche`}
          />
          <StatTile
            icon={CheckCircle2}
            label="Zusagequote"
            value={`${formatNumber(data.acceptanceRate)} %`}
            hint={`${data.totalAccepted} Zusagen · ${data.totalOffers} Angebote`}
          />
          <StatTile
            icon={Clock}
            label="Ø Antwortzeit"
            value={data.averageDaysToResponse == null ? "–" : `${formatNumber(data.averageDaysToResponse)} Tage`}
            hint="bis zur ersten Rückmeldung"
          />
        </div>

        {data.averageMatchScore != null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" aria-hidden="true" />
            Ø Match-Score deiner Analysen: {formatNumber(data.averageMatchScore)} %
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader icon={Filter} title="Bewerbungstrichter" description="Wie viele Bewerbungen die jeweilige Stufe erreicht haben." />
            <CardBody>
              <div className="space-y-3">
                {funnel.map((stage, index) => {
                  const previous = index > 0 ? funnel[index - 1] : null;
                  const conversion = previous && previous.value > 0 ? (stage.value / previous.value) * 100 : null;
                  const width = Math.max((stage.value / data.totalApplications) * 100, stage.value > 0 ? 2 : 0);

                  return (
                    <div key={stage.label} className="grid grid-cols-[88px_1fr_auto] items-center gap-3">
                      <span className="text-sm">{stage.label}</span>
                      <div className="h-7 rounded-md bg-muted">
                        <div className="h-7 rounded-md" style={{ width: `${width}%`, background: `var(--funnel-${index + 1})` }} />
                      </div>
                      <span className="text-sm font-medium">{stage.value}</span>
                      {previous ? (
                        <span className="col-start-2 -mt-1.5 text-xs text-muted-foreground">
                          {conversion == null ? "–" : `${formatNumber(conversion)} % von ${previous.label}`}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <ChartTable
                caption="Bewerbungstrichter"
                columns={["Stufe", "Anzahl", "Anteil an Bewerbungen"]}
                rows={funnel.map((stage) => [
                  stage.label,
                  stage.value,
                  `${formatNumber((stage.value / data.totalApplications) * 100)} %`,
                ])}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={CalendarDays} title="Aktivität (12 Wochen)" description="Neue Bewerbungen pro Woche." />
            <CardBody>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weekly} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} width={28} tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    content={
                      <ChartTooltip
                        title={(label) => {
                          const week = weekly.find((entry) => entry.name === label);
                          return `Woche ab ${week?.full ?? label}`;
                        }}
                      />
                    }
                  />
                  <Bar dataKey="Bewerbungen" name="Bewerbungen" fill="var(--status-applied)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ChartTable
                caption="Neue Bewerbungen pro Woche"
                columns={["Woche ab", "Bewerbungen"]}
                rows={weekly.map((week) => [week.full, week.Bewerbungen])}
              />
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader icon={TrendingUp} title="Monatsverlauf" description="Bewerbungen und erreichte Stufen je Monat." />
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthly}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} width={28} tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    formatter={(value) => <span style={{ color: "var(--color-muted-foreground)" }}>{value}</span>}
                  />
                  <Line type="monotone" dataKey="Bewerbungen" stroke="var(--status-applied)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Gespräche" stroke="var(--status-interview)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Angebote" stroke="var(--status-offer)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Absagen" stroke="var(--status-rejected)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              <ChartTable
                caption="Bewerbungen und erreichte Stufen je Monat"
                columns={["Monat", "Bewerbungen", "Gespräche", "Angebote", "Absagen"]}
                rows={monthly.map((month) => [month.name, month.Bewerbungen, month.Gespräche, month.Angebote, month.Absagen])}
              />
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader
              icon={PieChartIcon}
              title="Statusverteilung"
              description="Aktueller Status aller Bewerbungen, inkl. Entwürfe."
            />
            <CardBody>
              <div className="space-y-3">
                {statusRows.map((row) => (
                  <div key={row.status} className="grid grid-cols-[150px_1fr_auto] items-center gap-3">
                    <div>
                      <ApplicationStatusBadge status={row.status} />
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full"
                        style={{ width: `${row.share}%`, background: `var(--status-${row.status.toLowerCase()})` }}
                      />
                    </div>
                    <span className="text-sm">
                      {row.count} · {formatNumber(row.share)} %
                    </span>
                  </div>
                ))}
              </div>
              <ChartTable
                caption="Statusverteilung"
                columns={["Status", "Anzahl", "Anteil"]}
                rows={statusRows.map((row) => [statusConfig[row.status].label, row.count, `${formatNumber(row.share)} %`])}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
