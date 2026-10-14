import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  ListChecks,
  Sparkles,
  Target,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  analyzeApplication,
  generateCoverLetter,
  getAiStatus,
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
  const [copied, setCopied] = useState(false);

  const applications = useQuery({
    queryKey: ["applications", "ai"],
    queryFn: () => getApplications({ search: "", status: "", page: 1 }),
  });

  const aiStatus = useQuery({ queryKey: ["ai", "status"], queryFn: getAiStatus });
  const aiAvailable = aiStatus.data?.available === true;

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
    } catch {
      // Fehler wird inline angezeigt.
    }
  }

  async function handleGenerateLetter() {
    if (!selectedApplicationId) {
      return;
    }

    try {
      await coverLetterMutation.mutateAsync();
    } catch {
      // Fehler wird inline angezeigt.
    }
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar.
    }
  }

  return (
    <>
      <PageHeader
        icon={Sparkles}
        title="KI-Assistent"
        description="Analysiere Stellenanzeigen und generiere passende Anschreiben direkt für deine Bewerbungen."
        action={
          aiStatus.data ? (
            aiAvailable ? (
              <Badge tone="success">Lokale KI aktiv · {aiStatus.data.model}</Badge>
            ) : aiStatus.data.enabled ? (
              <Badge tone="warning">KI nicht erreichbar – regelbasiert</Badge>
            ) : (
              <Badge tone="neutral">Regelbasierte Analyse</Badge>
            )
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={Briefcase} title="Bewerbung auswählen" description="Wähle die Stelle aus, für die du Unterstützung möchtest." />
          <CardBody className="space-y-4">
            {applications.isPending ? (
              <p className="text-sm text-muted-foreground">Bewerbungen werden geladen...</p>
            ) : applications.isError ? (
              <p className="text-sm text-destructive">Die Bewerbungen konnten nicht geladen werden.</p>
            ) : applications.data?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Bewerbungen vorhanden.</p>
            ) : (
              <>
                <Field label="Ausgewählte Bewerbung">
                  <Select value={selectedApplicationId} onChange={(event) => setSelectedApplicationId(event.target.value)}>
                    {applications.data?.items.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.companyName} · {application.jobTitle}
                      </option>
                    ))}
                  </Select>
                </Field>

                {selectedApplication ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{selectedApplication.companyName}</div>
                    <div>{selectedApplication.jobTitle}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedApplication.technologies.slice(0, 6).map((technology) => (
                        <Badge key={technology} tone="neutral">
                          {technology}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Button className="w-full" onClick={() => void handleAnalyze()} disabled={!selectedApplicationId} loading={analysisMutation.isPending}>
                  {analysisMutation.isPending ? null : <Sparkles className="h-4 w-4" />}
                  {analysisMutation.isPending ? "Analysiere..." : "Analyse starten"}
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={Target} title="Ergebnis der Stellenanalyse" description="Wertet die Anforderungen der Stelle gegen dein Profil aus." />
            <CardBody>
              {analysisMutation.isPending ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {aiAvailable
                      ? "Die Stelle wird analysiert… (lokale KI kann bis zu einer Minute brauchen)"
                      : "Die Stelle wird analysiert…"}
                  </p>
                  <Skeleton className="h-28" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : analysisMutation.isError ? (
                <Alert tone="error">
                  {analysisMutation.error instanceof ApiError ? analysisMutation.error.message : "Die Analyse konnte nicht gestartet werden."}
                </Alert>
              ) : analysis ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:gap-6">
                    <ScoreRing score={analysis.matchScore} />
                    <div className="space-y-2">
                      <Badge tone={analysis.matchScore >= 80 ? "success" : analysis.matchScore >= 60 ? "primary" : "warning"}>
                        {analysis.matchScore >= 80 ? "Sehr gut passend" : analysis.matchScore >= 60 ? "Gut passend" : "Verbessern möglich"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                    </div>
                  </div>

                  {analysis.factors.length > 0 ? (
                    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                      <h3 className="text-sm font-semibold">So setzt sich der Score zusammen</h3>
                      {analysis.factors.map((factor) => (
                        <div key={factor.key}>
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium">{factor.label}</span>
                              <span className="ml-2 text-xs text-muted-foreground">Gewicht {factor.weight} %</span>
                            </div>
                            <span>{factor.score} %</span>
                          </div>
                          <Progress
                            className="mt-1"
                            value={factor.score}
                            tone={factor.score >= 80 ? "success" : factor.score >= 60 ? "primary" : "warning"}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">{factor.explanation}</p>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">Faktoren ohne ausreichende Daten werden nicht gewertet.</p>
                    </div>
                  ) : null}

                  {analysis.profileHints.length > 0 ? (
                    <Alert tone="warning" title="So wird die Analyse genauer">
                      <ul className="list-disc space-y-1 pl-4">
                        {analysis.profileHints.map((hint) => (
                          <li key={hint}>{hint}</li>
                        ))}
                      </ul>
                      <Link to="/einstellungen" className="mt-2 inline-block font-medium underline">
                        Profil vervollständigen
                      </Link>
                    </Alert>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-3">
                    <SkillBlock title="Erforderlich" icon={ListChecks} items={analysis.requiredSkills} tone="neutral" />
                    <SkillBlock title="Abgedeckt" icon={CheckCircle2} items={analysis.matchedSkills} tone="success" />
                    <SkillBlock title="Fehlend" icon={CircleDashed} items={analysis.missingSkills} tone="warning" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoList title="Empfehlungen" items={analysis.recommendations} />
                    <InfoList title="Lerninhalte" items={analysis.suggestedLearningTopics} />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {analysis.provider === "local" ? "Regelbasierte Analyse (lokal, ohne externe KI)" : `Analyse mit ${analysis.provider} · ${analysis.model}`}
                  </p>
                </div>
              ) : (
                <EmptyState icon={Target} title="Noch keine Analyse" description="Wähle links eine Bewerbung und starte die Auswertung." />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Wand2} title="Anschreiben generieren" description="Erzeuge auf Basis der Stelle ein passendes Anschreiben." />
            <CardBody className="space-y-4">
              <Field label="Titel">
                <Input value={coverLetterTitle} onChange={(event) => setCoverLetterTitle(event.target.value)} />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Stil">
                  <Select value={style} onChange={(event) => setStyle(event.target.value as WritingStyle)}>
                    {Object.entries(writingStyleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>

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

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void handleGenerateLetter()}
                disabled={!selectedApplicationId}
                loading={coverLetterMutation.isPending}
              >
                {coverLetterMutation.isPending ? null : <Wand2 className="h-4 w-4" />}
                {coverLetterMutation.isPending ? "Generiere Anschreiben..." : "Anschreiben erzeugen"}
              </Button>

              {coverLetterMutation.isError ? (
                <Alert tone="error">
                  {coverLetterMutation.error instanceof ApiError ? coverLetterMutation.error.message : "Das Anschreiben konnte nicht erzeugt werden."}
                </Alert>
              ) : null}

              {generatedLetter ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Generiertes Anschreiben</h3>
                      <Badge tone="primary">{generatedLetter.isDraft ? "Entwurf" : "Final"}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void handleCopy(generatedLetter.content)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Kopiert" : "Kopieren"}
                    </Button>
                  </div>
                  <Textarea readOnly value={generatedLetter.content} className="min-h-64 leading-6" />
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
  icon: LucideIcon;
  items: string[];
  tone: "neutral" | "success" | "warning";
}

function SkillBlock({ title, icon: Icon, items, tone }: SkillBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Einträge</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} tone={tone}>
              {item}
            </Badge>
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
