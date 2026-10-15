import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, LogOut, PenLine, Sparkles } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { Input } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/TagInput";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/features/auth/AuthProvider";
import { updateProfile, uploadResume } from "@/features/auth/api";
import { mergeSuggestion, parseSkills, toForm, toProfileRequest, type ProfileForm } from "@/features/settings/useProfileForm";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type Step = "choose" | "details";

/**
 * Pflicht-Einstieg nach der Registrierung: Profil ueber den Lebenslauf oder von Hand einrichten.
 * Abgeschlossen ist er, sobald Wunschposition und mindestens ein Skill gespeichert sind (prueft der Server).
 */
export function OnboardingPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("choose");
  const [form, setForm] = useState<ProfileForm>(() => toForm(user));
  const [fromResume, setFromResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [errors, setErrors] = useState<{ targetJobTitle?: string; skills?: string }>({});

  const skills = parseSkills(form.skills);

  const save = useMutation({
    mutationFn: () => updateProfile(toProfileRequest(form)),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      if (updated.onboardingCompleted !== false) {
        navigate("/", { replace: true });
      }
    },
  });

  function update(key: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleResume(file: File) {
    setUploadError("");
    setUploading(true);
    setResumeFileName(file.name);
    try {
      const suggestion = await uploadResume(file);
      setForm((current) => mergeSuggestion(current, suggestion).profile);
      setFromResume(true);
      setStep("details");
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : "Der Lebenslauf konnte nicht verarbeitet werden.");
    } finally {
      setUploading(false);
    }
  }

  // Zurueck zur Auswahl: Daten eines (evtl. falschen) Lebenslaufs verwerfen, damit sie nicht
  // unbemerkt mit "Selbst ausfuellen" gespeichert werden.
  function goBack() {
    setForm(toForm(user));
    setFromResume(false);
    setResumeFileName("");
    setErrors({});
    setStep("choose");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!form.targetJobTitle.trim()) nextErrors.targetJobTitle = "Bitte gib deine Wunschposition an.";
    if (skills.length === 0) nextErrors.skills = "Bitte gib mindestens einen Skill an.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      save.mutate();
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </header>

        <div className="space-y-2">
          <StepIndicator step={step} />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Willkommen{form.firstName.trim() ? `, ${form.firstName.trim()}` : ""}! Richte zuerst dein Profil ein.
          </h1>
          <p className="text-sm text-muted-foreground">
            JobPilot vergleicht Stellen mit deinem Profil. Ohne Wunschposition und Skills sind Match-Analyse und Anschreiben
            kaum aussagekräftig – deshalb geht es hier los.
          </p>
        </div>

        {step === "choose" ? (
          <div className="space-y-4">
            <section className="rounded-xl border border-primary/40 bg-card p-5 shadow-card ring-1 ring-primary/20">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                    Lebenslauf hochladen
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-text">Empfohlen</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Wir lesen Name, Wunschposition, Erfahrung und Skills aus. Du prüfst alles, bevor es gespeichert wird.
                  </p>
                </div>
              </div>
              <FileDropzone
                accept=".pdf,.docx,.txt,.md"
                hint="PDF, DOCX, TXT oder MD, max. 10 MB"
                loading={uploading}
                fileName={resumeFileName}
                onFile={(file) => void handleResume(file)}
              />
              {uploading ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Lebenslauf wird ausgelesen – mit lokaler KI kann das einige Sekunden dauern.
                </p>
              ) : null}
              {uploadError ? <Alert tone="error" className="mt-3">{uploadError}</Alert> : null}
            </section>

            <button
              type="button"
              onClick={() => setStep("details")}
              className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-card transition-colors hover:bg-muted"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <PenLine className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">Selbst ausfüllen</span>
                <span className="mt-1 block text-sm text-muted-foreground">Kein Lebenslauf zur Hand? Trag die wichtigsten Angaben von Hand ein.</span>
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
            {fromResume ? (
              <Alert tone="info" title="Aus deinem Lebenslauf vorausgefüllt">
                Bitte prüfe die Angaben und ergänze, was fehlt. Bereits Eingetragenes wurde nicht überschrieben.
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vorname">
                <Input value={form.firstName} autoComplete="given-name" onChange={(event) => update("firstName", event.target.value)} />
              </Field>
              <Field label="Nachname">
                <Input value={form.lastName} autoComplete="family-name" onChange={(event) => update("lastName", event.target.value)} />
              </Field>
              <Field label="Wunschposition *" error={errors.targetJobTitle}>
                <Input
                  value={form.targetJobTitle}
                  invalid={Boolean(errors.targetJobTitle)}
                  placeholder="z. B. Junior Backend Developer"
                  onChange={(event) => update("targetJobTitle", event.target.value)}
                />
              </Field>
              <Field label="Standort">
                <Input value={form.location} placeholder="z. B. Berlin" onChange={(event) => update("location", event.target.value)} />
              </Field>
            </div>

            <Field label="Skills *" htmlFor="onboarding-skills" error={errors.skills} hint={errors.skills ? undefined : "Mit Enter oder Komma hinzufügen – z. B. Programmiersprachen, Frameworks, Tools."}>
              <TagInput id="onboarding-skills" value={skills} onChange={(tags) => update("skills", tags.join(", "))} placeholder="z. B. C#, React, Docker" />
            </Field>

            <Field label="Kurzbeschreibung (optional)" hint="Zwei, drei Sätze über dich – Grundlage für den Einstieg im Anschreiben.">
              <Textarea value={form.profileSummary} onChange={(event) => update("profileSummary", event.target.value)} />
            </Field>

            {save.isError ? (
              <Alert tone="error">{save.error instanceof ApiError ? save.error.message : "Das Profil konnte nicht gespeichert werden."}</Alert>
            ) : null}
            {save.isSuccess && save.data.onboardingCompleted === false ? (
              <Alert tone="warning">Bitte gib eine Wunschposition und mindestens einen Skill an.</Alert>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </Button>
              <Button type="submit" loading={save.isPending}>
                Profil speichern und loslegen
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">Alle Angaben kannst du später unter Einstellungen ändern.</p>
      </div>
    </main>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: "choose", label: "Startpunkt wählen" },
    { key: "details", label: "Profil prüfen" },
  ] as const;

  return (
    <ol className="flex items-center gap-2 text-xs font-medium" aria-label="Fortschritt">
      {steps.map((item, index) => {
        const active = item.key === step;
        const done = step === "details" && item.key === "choose";
        return (
          <li key={item.key} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            {index > 0 ? <span className="h-px w-6 bg-border" aria-hidden="true" /> : null}
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                active || done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span className={active ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
