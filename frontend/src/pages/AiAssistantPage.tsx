import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  analyzeApplication,
  generateCoverLetter,
  getApplications,
  type AiAnalysis,
  type GeneratedCoverLetter,
  type WritingStyle,
} from "@/features/applications/api";
import { ApiError } from "@/lib/api";

const writingStyleLabels: Record<WritingStyle, string> = {
  Professional: "Professionell",
  Formal: "Formal",
  Modern: "Modern",
  Concise: "Konkret",
  Enthusiastic: "Begeistert",
};

export function AiAssistantPage() {
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [coverLetterTitle, setCoverLetterTitle] = useState("Anschreiben für die Position");
  const [style, setStyle] = useState<WritingStyle>("Professional");
  const [isDraft, setIsDraft] = useState(true);

  const applications = useQuery({
    queryKey: ["applications", "ai"],
    queryFn: () => getApplications({ search: "", status: "", page: 1 }),
  });

  useEffect(() => {
    const firstApplication = applications.data?.items[0];
    if (firstApplication && !selectedApplicationId) {
      setSelectedApplicationId(firstApplication.id);
      setCoverLetterTitle(`Anschreiben - ${firstApplication.jobTitle}`);
    }
  }, [applications.data, selectedApplicationId]);

  useEffect(() => {
    if (!selectedApplicationId && applications.data?.items[0]) {
      setSelectedApplicationId(applications.data.items[0].id);
    }
  }, [applications.data, selectedApplicationId]);

  useEffect(() => {
    if (selectedApplicationId && applications.data) {
      const selected = applications.data.items.find((application) => application.id === selectedApplicationId);
      if (selected) {
        setCoverLetterTitle(`Anschreiben - ${selected.jobTitle}`);
      }
    }
  }, [applications.data, selectedApplicationId]);

  const selectedApplication = useMemo(
    () => applications.data?.items.find((application) => application.id === selectedApplicationId) ?? null,
    [applications.data, selectedApplicationId],
  );

  const analysisMutation = useMutation({
    mutationFn: (applicationId: string) => analyzeApplication(applicationId),
  });

  const coverLetterMutation = useMutation({
    mutationFn: () =>
      generateCoverLetter(selectedApplicationId, {
        title: coverLetterTitle,
        style,
        isDraft,
      }),
  });

  const analysis: AiAnalysis | undefined = analysisMutation.data;
  const generatedLetter: GeneratedCoverLetter | undefined = coverLetterMutation.data;

  async function handleAnalyze() {
    if (!selectedApplicationId) {
      return;
    }

    try {
      await analysisMutation.mutateAsync(selectedApplicationId);
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Die Analyse konnte nicht gestartet werden.");
    }
  }

  async function handleGenerateLetter() {
    if (!selectedApplicationId) {
      return;
    }

    try {
      await coverLetterMutation.mutateAsync();
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Das Anschreiben konnte nicht generiert werden.");
    }
  }

  return (
    <>
      <PageHeader
        title="KI-Assistent"
        description="Analysiere Stellenanzeigen und generiere passende Anschreiben direkt für deine Bewerbungen."
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Bewerbung auswählen" description="Wähle die Stelle aus, für die du Unterstützung möchtest." />
          <CardBody className="space-y-4">
            {applications.isPending ? (
              <p className="text-sm text-muted-foreground">Bewerbungen werden geladen...</p>
            ) : applications.isError ? (
              <p className="text-sm text-destructive">Die Bewerbungen konnten nicht geladen werden.</p>
            ) : applications.data?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Bewerbungen vorhanden.</p>
            ) : (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Ausgewählte Bewerbung</span>
                  <select
                    value={selectedApplicationId}
                    onChange={(event) => setSelectedApplicationId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {applications.data?.items.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.companyName} · {application.jobTitle}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedApplication ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{selectedApplication.companyName}</div>
                    <div>{selectedApplication.jobTitle}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedApplication.technologies.slice(0, 6).map((technology) => (
                        <span key={technology} className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground ring-1 ring-border">
                          {technology}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Button className="w-full" onClick={() => void handleAnalyze()} disabled={analysisMutation.isPending || !selectedApplicationId}>
                  <Sparkles className="h-4 w-4" />
                  {analysisMutation.isPending ? "Analysiere..." : "Analyse starten"}
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Ergebnis der Stellenanalyse" description="Wertet die Anforderungen der Stelle gegen dein Profil aus." />
            <CardBody>
              {analysisMutation.isPending ? (
                <p className="text-sm text-muted-foreground">Die Stelle wird analysiert...</p>
              ) : analysis ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Match-Score</div>
                      <div className="text-3xl font-semibold">{analysis.matchScore}%</div>
                    </div>
                    <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {analysis.matchScore >= 80 ? "Sehr gut passend" : analysis.matchScore >= 60 ? "Gut passend" : "Verbessern möglich"}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Zusammenfassung</h3>
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <SkillBlock title="Erforderlich" items={analysis.requiredSkills} tone="neutral" />
                    <SkillBlock title="Abgedeckt" items={analysis.matchedSkills} tone="success" />
                    <SkillBlock title="Fehlend" items={analysis.missingSkills} tone="warning" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoList title="Empfehlungen" items={analysis.recommendations} />
                    <InfoList title="Lerninhalte" items={analysis.suggestedLearningTopics} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Analyse vorhanden. Starte die Auswertung für eine passende Bewerbung.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Anschreiben generieren" description="Erzeuge auf Basis der Stelle ein passendes Anschreiben." />
            <CardBody className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Titel</span>
                <input
                  value={coverLetterTitle}
                  onChange={(event) => setCoverLetterTitle(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Stil</span>
                  <select
                    value={style}
                    onChange={(event) => setStyle(event.target.value as WritingStyle)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {Object.entries(writingStyleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 pt-8 text-sm">
                  <input
                    type="checkbox"
                    checked={isDraft}
                    onChange={(event) => setIsDraft(event.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Als Entwurf speichern
                </label>
              </div>

              <Button variant="secondary" className="w-full" onClick={() => void handleGenerateLetter()} disabled={coverLetterMutation.isPending || !selectedApplicationId}>
                <Wand2 className="h-4 w-4" />
                {coverLetterMutation.isPending ? "Generiere Anschreiben..." : "Anschreiben erzeugen"}
              </Button>

              {coverLetterMutation.isError ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{coverLetterMutation.error instanceof ApiError ? coverLetterMutation.error.message : "Das Anschreiben konnte nicht erzeugt werden."}</span>
                </div>
              ) : null}

              {generatedLetter ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Generiertes Anschreiben</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {generatedLetter.isDraft ? "Entwurf" : "Final"}
                    </span>
                  </div>
                  <textarea
                    readOnly
                    value={generatedLetter.content}
                    className="min-h-[220px] w-full rounded-lg border border-border bg-background p-3 text-sm leading-6 text-foreground"
                  />
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

interface SkillBlockProps {
  title: string;
  items: string[];
  tone: "neutral" | "success" | "warning";
}

function SkillBlock({ title, items, tone }: SkillBlockProps) {
  const colors = {
    neutral: "bg-muted/60 text-foreground border-border",
    success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    warning: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Einträge</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className={`rounded-full border px-2 py-1 text-xs ${colors[tone]}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface InfoListProps {
  title: string;
  items: string[];
}

function InfoList({ title, items }: InfoListProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Einträge</p>
      ) : (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
