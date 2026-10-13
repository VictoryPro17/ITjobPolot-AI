import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { getDatabaseHealth, type HealthResponse } from "@/features/health/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

/**
 * Verbindungsnachweis fuer Phase 1: Frontend -> API -> PostgreSQL.
 */
export function BackendStatusCard() {
  const { data, error, isPending, isFetching, refetch } = useQuery<HealthResponse>({
    queryKey: ["health", "database"],
    queryFn: getDatabaseHealth,
  });

  return (
    <Card>
      <CardHeader
        title="Systemstatus"
        description="Verbindung zwischen Oberfläche, API und Datenbank"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Status neu laden"
          >
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
            Aktualisieren
          </Button>
        }
      />
      <CardBody className="space-y-3">
        {isPending ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <span className="sr-only">Status wird geladen</span>
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="space-y-2">
            <StatusBadge tone="danger">API nicht erreichbar</StatusBadge>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <p className="text-sm text-muted-foreground">
              Starten Sie die API mit <code className="rounded bg-muted px-1.5 py-0.5">dotnet run --project src/JobPilot.Api</code>{" "}
              und die Datenbank mit <code className="rounded bg-muted px-1.5 py-0.5">docker compose up -d</code>.
            </p>
          </div>
        ) : null}

        {data ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">API</dt>
              <dd className="mt-1">
                <StatusBadge tone={data.status === "ok" ? "success" : "warning"}>
                  {data.status === "ok" ? "Erreichbar" : "Eingeschränkt"}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Datenbank</dt>
              <dd className="mt-1">
                <StatusBadge tone={data.databaseConnected ? "success" : "danger"}>
                  {data.databaseConnected ? "Verbunden" : "Keine Verbindung"}
                </StatusBadge>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Letzte Prüfung</dt>
              <dd className="mt-1 text-sm">{new Date(data.timestamp).toLocaleString("de-DE")}</dd>
            </div>
          </dl>
        ) : null}
      </CardBody>
    </Card>
  );
}