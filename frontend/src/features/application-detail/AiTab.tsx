import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, FileSignature, Lightbulb, RefreshCw, Sparkles } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  analyzeApplication,
  getCoverLetters,
  getLatestAnalysis,
  type AiAnalysis,
  type ApplicationDetail,
  type GeneratedCoverLetter,
} from "@/features/applications/api";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";

export function analysisQueryKey(applicationId: string) {
  return ["application", applicationId, "analysis"] as const;
}

/** Letzte gespeicherte Analyse, erzeugte Anschreiben und Absprung in den KI-Assistenten. */
export function AiTab({ application }: { application: ApplicationDetail }) {
  const queryClient = useQueryClient();
  const analysisKey = analysisQueryKey(application.id);
  const analysis = useQuery({ queryKey: analysisKey, queryFn: () => getLatestAnalysis(application.id) });
  const coverLetters = useQuery({
    queryKey: ["application", application.id, "cover-letters"],
    queryFn: () => getCoverLetters(application.id),
  });

  const analyze = useMutation({
    mutationFn: () => analyzeApplication(application.id),
    onSuccess: (result) => {
      queryClient.setQueryData(analysisKey, result);
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });

  const assistantLink = `/ki-assistent?bewerbung=${application.id}`;
  const hasDescription = Boolean(application.jobDescription?.trim());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={Sparkles}
          title="Match-Analyse"
          description="Wie gut dein Profil zur Stelle passt."
          action={
            analysis.data ? (
              <Button variant="secondary" size="sm" loading={analyze.isPending} onClick={() => analyze.mutate()}>
                <RefreshCw className="h-4 w-4" />
                Neu analysieren
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          {analyze.isError ? (
            <Alert tone="error">{analyze.error instanceof ApiError ? analyze.error.message : "Die Analyse ist fehlgeschlagen."}</Alert>
          ) : null}
          {!hasDescription ? (
            <Alert tone="info">
              Ohne Stellenbeschreibung ist die Analyse ungenau.{" "}
              <Link to={`/bewerbungen/${application.id}/bearbeiten`} className="font-medium underline">
                Beschreibung ergänzen
              </Link>
            </Alert>
          ) : null}

          {analysis.isPending ? (
            <Skeleton className="h-40" />
          ) : analysis.isError ? (
            <Alert tone="error">Die letzte Analyse konnte nicht geladen werden.</Alert>
          ) : analysis.data == null ? (
            <EmptyState
              icon={Sparkles}
              title="Noch nicht analysiert"
              description="Vergleiche die Stelle mit deinem Profil und sieh, welche Skills passen und welche fehlen."
              action={
                <Button loading={analyze.isPending} onClick={() => analyze.mutate()}>
                  <Sparkles className="h-4 w-4" />
                  Jetzt analysieren
                </Button>
              }
            />
          ) : (
            <AnalysisResult analysis={analysis.data} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={FileSignature}
          title="Anschreiben"
          description="Für diese Bewerbung erzeugte Entwürfe."
          action={
            <Link to={assistantLink}>
              <Button variant="secondary" size="sm">
                Neues Anschreiben
              </Button>
            </Link>
          }
        />
        <CardBody>
          {coverLetters.isPending ? (
            <Skeleton className="h-16" />
          ) : coverLetters.isError ? (
            <Alert tone="error">Die Anschreiben konnten nicht geladen werden.</Alert>
          ) : coverLetters.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Anschreiben. Erstelle eins im{" "}
              <Link to={assistantLink} className="font-medium text-primary hover:underline">
                KI-Assistenten
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {coverLetters.data.map((letter) => (
                <CoverLetterItem key={letter.id} letter={letter} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function AnalysisResult({ analysis }: { analysis: AiAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ScoreRing score={analysis.matchScore} size={96} />
        <div className="min-w-0 space-y-1">
          <p className="text-sm">{analysis.summary}</p>
          <p className="text-xs text-muted-foreground" title={formatDateTime(analysis.createdAt)}>
            Analysiert {formatRelative(analysis.createdAt)}
            {analysis.provider ? ` · ${analysis.provider}${analysis.model ? ` (${analysis.model})` : ""}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SkillList title="Passende Skills" items={analysis.matchedSkills} tone="success" empty="Keine Übereinstimmungen gefunden." />
        <SkillList title="Fehlende Skills" items={analysis.missingSkills} tone="warning" empty="Nichts Wesentliches fehlt." />
      </div>

      {analysis.recommendations.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
            Empfehlungen
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {analysis.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SkillList({ title, items, tone, empty }: { title: string; items: string[]; tone: "success" | "warning"; empty: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">
        {title} <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((skill) => (
            <Badge key={skill} tone={tone}>
              {skill}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function CoverLetterItem({ letter }: { letter: GeneratedCoverLetter }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage nicht verfuegbar; Text bleibt markierbar.
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          <span className="truncate text-sm font-medium">{letter.title}</span>
          {letter.isDraft ? <Badge tone="neutral">Entwurf</Badge> : null}
        </button>
        <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(letter.createdAt)}</span>
        <Button variant="ghost" size="icon" onClick={() => void copy()} aria-label="Anschreiben kopieren">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {open ? <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{letter.content}</p> : null}
    </li>
  );
}
