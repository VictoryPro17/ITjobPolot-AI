import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, CalendarClock, FilePen, FileText, Save, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { TagInput } from "@/components/ui/TagInput";
import { Textarea } from "@/components/ui/Textarea";
import {
  createApplication,
  employmentTypeLabels,
  getApplication,
  updateApplication,
  workModelLabels,
  type ApplicationRequest,
  type ApplicationStatus,
  type EmploymentType,
  type WorkModel,
} from "@/features/applications/api";
import { applicationStatusOrder, statusConfig } from "@/features/applications/status";
import { ApiError } from "@/lib/api";

type FormErrors = Partial<Record<keyof ApplicationRequest, string>>;

const initialForm: ApplicationRequest = {
  companyName: "",
  jobTitle: "",
  location: "",
  employmentType: "Unspecified",
  workModel: "Unspecified",
  salary: "",
  jobPostingUrl: "",
  appliedOn: null,
  status: "Draft",
  jobDescription: "",
  technologies: [],
  notes: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  interviewAt: null,
  interviewLocation: "",
};

/** Maximallaengen wie im Backend-Validator, damit Fehler schon vor dem Absenden sichtbar sind. */
const maxLengths: Partial<Record<keyof ApplicationRequest, number>> = {
  companyName: 200,
  jobTitle: 200,
  location: 200,
  salary: 100,
  jobPostingUrl: 1000,
  jobDescription: 20000,
  notes: 8000,
  contactName: 150,
  contactEmail: 256,
  contactPhone: 50,
  interviewLocation: 300,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Uebernimmt nur die Formularfelder; fehlende Werte (die API laesst null weg) werden zu Standardwerten. */
function toForm(data: object): ApplicationRequest {
  const form = { ...initialForm };
  for (const key of Object.keys(initialForm) as (keyof ApplicationRequest)[]) {
    const value = (data as Record<string, unknown>)[key];
    if (value != null) {
      (form as Record<string, unknown>)[key] = value;
    }
  }
  return form;
}

/** ISO-Zeitpunkt in den lokalen Wert fuer ein datetime-local-Feld umwandeln. */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(form: ApplicationRequest): FormErrors {
  const errors: FormErrors = {};

  if (!form.companyName.trim()) errors.companyName = "Bitte gib den Firmennamen ein.";
  if (!form.jobTitle.trim()) errors.jobTitle = "Bitte gib den Jobtitel ein.";

  for (const [key, max] of Object.entries(maxLengths) as [keyof ApplicationRequest, number][]) {
    const value = form[key];
    if (!errors[key] && typeof value === "string" && value.length > max) {
      errors[key] = `Höchstens ${max.toLocaleString("de-DE")} Zeichen erlaubt.`;
    }
  }

  if (form.jobPostingUrl.trim() && !isValidUrl(form.jobPostingUrl.trim())) {
    errors.jobPostingUrl = "Bitte gib einen gültigen Link an (http oder https).";
  }
  if (form.contactEmail.trim() && !emailPattern.test(form.contactEmail.trim())) {
    errors.contactEmail = "Bitte gib eine gültige E-Mail-Adresse ein.";
  }
  if (form.status !== "Draft" && !form.appliedOn) {
    errors.appliedOn = "Ab dem Status „Beworben“ wird ein Bewerbungsdatum benötigt.";
  } else if (form.appliedOn && form.appliedOn > todayIso()) {
    errors.appliedOn = "Das Bewerbungsdatum darf nicht in der Zukunft liegen.";
  }
  if (form.technologies.length > 40) errors.technologies = "Es sind höchstens 40 Technologien erlaubt.";
  else if (form.technologies.some((item) => item.length > 60)) errors.technologies = "Eine Technologie darf höchstens 60 Zeichen lang sein.";

  return errors;
}

function Section({ icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader icon={icon} title={title} description={description} />
      <CardBody className="grid gap-5 md:grid-cols-2">{children}</CardBody>
    </Card>
  );
}

export function ApplicationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const existing = useQuery({ queryKey: ["application", id], queryFn: () => getApplication(id!), enabled: isEdit });

  const baseline = useMemo(() => (existing.data ? toForm(existing.data) : initialForm), [existing.data]);
  const [form, setForm] = useState<ApplicationRequest>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    setForm(baseline);
    setErrors({});
  }, [baseline]);

  const backTarget = id ? `/bewerbungen/${id}` : "/bewerbungen";
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  // Schutz vor versehentlichem Schliessen oder Neuladen mit ungespeicherten Aenderungen.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const save = useMutation({
    mutationFn: (request: ApplicationRequest) => (id ? updateApplication(id, request) : createApplication(request)),
    onSuccess: (saved) => {
      for (const key of ["applications", "summary", "statistics", "application"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      // Nach dem Speichern zur Detailseite; faellt die Antwort ohne Kennung aus, zur Liste.
      const targetId = id ?? (saved as { id?: string } | undefined)?.id;
      navigate(targetId ? `/bewerbungen/${targetId}` : "/bewerbungen");
    },
  });

  function update<K extends keyof ApplicationRequest>(field: K, value: ApplicationRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function changeStatus(status: ApplicationStatus) {
    setForm((current) => ({
      ...current,
      status,
      // Beim ersten Wechsel weg vom Entwurf das heutige Datum vorschlagen.
      appliedOn: status !== "Draft" && !current.appliedOn ? todayIso() : current.appliedOn,
    }));
    setErrors((current) => ({ ...current, status: undefined, appliedOn: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const request: ApplicationRequest = {
      ...form,
      companyName: form.companyName.trim(),
      jobTitle: form.jobTitle.trim(),
      jobPostingUrl: form.jobPostingUrl.trim(),
      contactEmail: form.contactEmail.trim(),
      technologies: form.technologies.map((item) => item.trim()).filter(Boolean),
    };

    const clientErrors = validate(request);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setSubmitError("Bitte prüfe die markierten Felder.");
      return;
    }

    try {
      await save.mutateAsync(request);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setErrors(requestError.fieldErrors as FormErrors);
        setSubmitError(requestError.message);
      } else {
        setSubmitError("Speichern fehlgeschlagen.");
      }
    }
  }

  function cancel() {
    if (isDirty) setConfirmLeave(true);
    else navigate(backTarget);
  }

  const header = (
    <PageHeader
      icon={isEdit ? FilePen : Briefcase}
      title={isEdit ? "Bewerbung bearbeiten" : "Neue Bewerbung"}
      description="Erfasse die wichtigsten Infos zur Stelle. Pflichtfelder sind mit * markiert."
    />
  );

  if (isEdit && existing.isPending) {
    return (
      <>
        {header}
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </>
    );
  }

  if (isEdit && existing.isError) {
    const notFound = existing.error instanceof ApiError && existing.error.status === 404;
    return (
      <>
        {header}
        <Alert tone="error" title={notFound ? "Bewerbung nicht gefunden" : "Laden fehlgeschlagen"}>
          {notFound ? "Diese Bewerbung existiert nicht oder wurde gelöscht." : "Die Bewerbung konnte nicht geladen werden."}{" "}
          <Link to="/bewerbungen" className="font-medium underline">
            Zur Übersicht
          </Link>
        </Alert>
      </>
    );
  }

  const interviewWithoutDate = form.status === "Interview" && !form.interviewAt;

  return (
    <>
      {header}

      <form className="space-y-6" onSubmit={submit} noValidate>
        {submitError ? <Alert tone="error">{submitError}</Alert> : null}

        <Section icon={Briefcase} title="Stelle" description="Firma, Position und Rahmenbedingungen.">
          <Field label="Firma *" error={errors.companyName}>
            <Input value={form.companyName} invalid={Boolean(errors.companyName)} onChange={(event) => update("companyName", event.target.value)} autoFocus={!isEdit} />
          </Field>
          <Field label="Jobtitel *" error={errors.jobTitle}>
            <Input value={form.jobTitle} invalid={Boolean(errors.jobTitle)} onChange={(event) => update("jobTitle", event.target.value)} />
          </Field>
          <Field label="Ort" error={errors.location}>
            <Input value={form.location} invalid={Boolean(errors.location)} onChange={(event) => update("location", event.target.value)} placeholder="z. B. Berlin" />
          </Field>
          <Field label="Gehalt" error={errors.salary} hint="Frei formuliert, z. B. 55–65 k € brutto">
            <Input value={form.salary} invalid={Boolean(errors.salary)} onChange={(event) => update("salary", event.target.value)} />
          </Field>
          <Field label="Arbeitsmodell">
            <Select value={form.workModel} onChange={(event) => update("workModel", event.target.value as WorkModel)}>
              {(Object.entries(workModelLabels) as [WorkModel, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Beschäftigungsart">
            <Select value={form.employmentType} onChange={(event) => update("employmentType", event.target.value as EmploymentType)}>
              {(Object.entries(employmentTypeLabels) as [EmploymentType, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stellenlink" error={errors.jobPostingUrl} className="md:col-span-2">
            <Input type="url" value={form.jobPostingUrl} invalid={Boolean(errors.jobPostingUrl)} onChange={(event) => update("jobPostingUrl", event.target.value)} placeholder="https://…" />
          </Field>
        </Section>

        <Section icon={CalendarClock} title="Status & Termine" description="Wo die Bewerbung gerade steht.">
          <Field label="Status" error={errors.status} hint={statusConfig[form.status].description}>
            <Select value={form.status} onChange={(event) => changeStatus(event.target.value as ApplicationStatus)}>
              {applicationStatusOrder.map((status) => (
                <option key={status} value={status}>
                  {statusConfig[status].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={form.status === "Draft" ? "Bewerbungsdatum" : "Bewerbungsdatum *"} error={errors.appliedOn}>
            <Input type="date" max={todayIso()} value={form.appliedOn ?? ""} invalid={Boolean(errors.appliedOn)} onChange={(event) => update("appliedOn", event.target.value || null)} />
          </Field>
          <Field label="Gesprächstermin" error={errors.interviewAt}>
            <Input
              type="datetime-local"
              value={toLocalInputValue(form.interviewAt)}
              invalid={Boolean(errors.interviewAt)}
              onChange={(event) => update("interviewAt", event.target.value ? new Date(event.target.value).toISOString() : null)}
            />
          </Field>
          <Field label="Gesprächsort" error={errors.interviewLocation}>
            <Input value={form.interviewLocation} invalid={Boolean(errors.interviewLocation)} onChange={(event) => update("interviewLocation", event.target.value)} placeholder="z. B. Videocall oder Adresse" />
          </Field>
          {interviewWithoutDate ? (
            <Alert tone="info" className="md:col-span-2">
              Status ist „Gespräch“, aber es ist noch kein Termin eingetragen. Trag ihn ein, dann erscheint er auf dem Dashboard.
            </Alert>
          ) : null}
        </Section>

        <Section icon={UserRound} title="Kontakt" description="Ansprechperson im Unternehmen (optional).">
          <Field label="Name" error={errors.contactName}>
            <Input value={form.contactName} invalid={Boolean(errors.contactName)} onChange={(event) => update("contactName", event.target.value)} autoComplete="off" />
          </Field>
          <Field label="E-Mail" error={errors.contactEmail}>
            <Input type="email" value={form.contactEmail} invalid={Boolean(errors.contactEmail)} onChange={(event) => update("contactEmail", event.target.value)} autoComplete="off" />
          </Field>
          <Field label="Telefon" error={errors.contactPhone}>
            <Input type="tel" value={form.contactPhone} invalid={Boolean(errors.contactPhone)} onChange={(event) => update("contactPhone", event.target.value)} autoComplete="off" />
          </Field>
        </Section>

        <Section icon={FileText} title="Details" description="Technologien, Stellenbeschreibung und eigene Notizen.">
          <Field label="Technologien" error={errors.technologies} hint="Mit Enter oder Komma hinzufügen." className="md:col-span-2">
            <TagInput value={form.technologies} onChange={(tags) => update("technologies", tags)} placeholder="z. B. React, C#, Docker" />
          </Field>
          <Field label="Stellenbeschreibung" error={errors.jobDescription} hint="Wird für die KI-Analyse genutzt." className="md:col-span-2">
            <Textarea className="min-h-40" value={form.jobDescription} invalid={Boolean(errors.jobDescription)} onChange={(event) => update("jobDescription", event.target.value)} />
          </Field>
          <Field label="Notizen" error={errors.notes} className="md:col-span-2">
            <Textarea value={form.notes} invalid={Boolean(errors.notes)} onChange={(event) => update("notes", event.target.value)} />
          </Field>
        </Section>

        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
          {isDirty ? <span className="mr-auto text-xs text-muted-foreground">Ungespeicherte Änderungen</span> : null}
          <Button type="button" variant="secondary" onClick={cancel}>
            Abbrechen
          </Button>
          <Button type="submit" loading={save.isPending}>
            <Save className="h-4 w-4" />
            Speichern
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmLeave}
        title="Änderungen verwerfen?"
        description="Du hast ungespeicherte Änderungen. Wenn du die Seite verlässt, gehen sie verloren."
        confirmLabel="Verwerfen"
        cancelLabel="Weiter bearbeiten"
        tone="destructive"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => navigate(backTarget)}
      />
    </>
  );
}
