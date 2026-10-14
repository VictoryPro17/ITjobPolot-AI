import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, MapPin, Pencil, RefreshCcw, Sparkles, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { ApplicationStatusBadge } from "@/components/ui/ApplicationStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityTab } from "@/features/application-detail/ActivityTab";
import { AiTab } from "@/features/application-detail/AiTab";
import { DetailSidebar } from "@/features/application-detail/DetailSidebar";
import { DocumentsTab } from "@/features/application-detail/DocumentsTab";
import { OverviewTab } from "@/features/application-detail/OverviewTab";
import { StatusChangeDialog } from "@/features/application-detail/StatusChangeDialog";
import { deleteApplication, getApplication, workModelLabels, type ApplicationDetail } from "@/features/applications/api";
import { statusConfig } from "@/features/applications/status";
import { ApiError } from "@/lib/api";

const tabs = [
  { value: "uebersicht", label: "Übersicht" },
  { value: "aktivitaet", label: "Aktivität" },
  { value: "dokumente", label: "Dokumente" },
  { value: "ki", label: "KI" },
] as const;

type Tab = (typeof tabs)[number]["value"];

function parseTab(value: string | null): Tab {
  return tabs.find((tab) => tab.value === value)?.value ?? "uebersicht";
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ApplicationDetailPage() {
  const { id = "" } = useParams();
  const application = useQuery({ queryKey: ["application", id], queryFn: () => getApplication(id), enabled: Boolean(id) });

  const backLink = (
    <Link to="/bewerbungen" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      Alle Bewerbungen
    </Link>
  );

  if (application.isPending) {
    return (
      <>
        {backLink}
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Skeleton className="h-96" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </>
    );
  }

  if (application.isError || !application.data) {
    const notFound = application.error instanceof ApiError && application.error.status === 404;
    return (
      <>
        {backLink}
        <Alert tone="error" title={notFound ? "Bewerbung nicht gefunden" : "Laden fehlgeschlagen"}>
          {notFound ? "Diese Bewerbung existiert nicht oder wurde gelöscht." : "Die Bewerbung konnte nicht geladen werden."}
        </Alert>
      </>
    );
  }

  return (
    <>
      {backLink}
      <DetailContent application={application.data} />
    </>
  );
}

function DetailContent({ application }: { application: ApplicationDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const config = statusConfig[application.status];

  const remove = useMutation({
    mutationFn: () => deleteApplication(application.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["application", application.id] });
      for (const key of ["applications", "summary", "statistics", "documents", "reminders"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      navigate("/bewerbungen");
    },
  });

  function selectTab(next: Tab) {
    setSearchParams(next === "uebersicht" ? {} : { tab: next }, { replace: true });
  }

  const meta = [application.location, application.workModel !== "Unspecified" ? workModelLabels[application.workModel] : null].filter(Boolean).join(" · ");

  return (
    <>
      <Card className="mb-6 overflow-hidden">
        <div className="h-1" style={{ background: config.colorVar }} aria-hidden="true" />
        <CardBody className="flex flex-col gap-4 py-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-semibold"
              style={{ background: `color-mix(in oklab, ${config.colorVar} 14%, transparent)`, color: config.colorVar }}
              aria-hidden="true"
            >
              {application.companyName.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">{application.jobTitle}</h1>
              <p className="text-muted-foreground">{application.companyName}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <ApplicationStatusBadge status={application.status} />
                {meta ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {meta}
                  </span>
                ) : null}
                {application.jobPostingUrl ? (
                  <a
                    href={application.jobPostingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {hostname(application.jobPostingUrl)}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setStatusOpen(true)}>
              <RefreshCcw className="h-4 w-4" />
              Status ändern
            </Button>
            <Button variant="secondary" onClick={() => selectTab("ki")}>
              <Sparkles className="h-4 w-4" />
              KI-Analyse
            </Button>
            <Link to={`/bewerbungen/${application.id}/bearbeiten`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Button>
            </Link>
            <Button variant="ghost" size="icon" aria-label="Bewerbung löschen" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <SegmentedTabs value={tab} onChange={selectTab} items={tabs.map((item) => ({ value: item.value, label: item.label }))} />
          <div role="tabpanel">
            {tab === "uebersicht" ? <OverviewTab application={application} /> : null}
            {tab === "aktivitaet" ? <ActivityTab application={application} /> : null}
            {tab === "dokumente" ? <DocumentsTab applicationId={application.id} /> : null}
            {tab === "ki" ? <AiTab application={application} /> : null}
          </div>
        </div>
        <aside className="min-w-0">
          <DetailSidebar application={application} />
        </aside>
      </div>

      <StatusChangeDialog application={application} open={statusOpen} onClose={() => setStatusOpen(false)} />
      <ConfirmDialog
        open={confirmDelete}
        title="Bewerbung löschen?"
        description={`Die Bewerbung als ${application.jobTitle} bei ${application.companyName} wird samt Notizen und Verlauf endgültig gelöscht.`}
        confirmLabel="Löschen"
        tone="destructive"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      >
        {remove.isError ? <Alert tone="error">{remove.error instanceof ApiError ? remove.error.message : "Löschen fehlgeschlagen."}</Alert> : null}
      </ConfirmDialog>
    </>
  );
}
