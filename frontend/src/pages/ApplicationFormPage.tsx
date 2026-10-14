import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { applicationStatuses, createApplication, getApplication, updateApplication, type ApplicationRequest, type EmploymentType, type WorkModel } from "@/features/applications/api";
import { ApiError } from "@/lib/api";

const initialForm: ApplicationRequest = { companyName: "", jobTitle: "", location: "", employmentType: "Unspecified", workModel: "Unspecified", salary: "", jobPostingUrl: "", appliedOn: null, status: "Draft", jobDescription: "", technologies: [], notes: "", contactName: "", contactEmail: "", contactPhone: "", interviewAt: null, interviewLocation: "" };

/** ISO-Zeitpunkt in den lokalen Wert fuer ein datetime-local-Feld umwandeln. */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ApplicationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const existing = useQuery({ queryKey: ["application", id], queryFn: () => getApplication(id!), enabled: Boolean(id) });
  const [form, setForm] = useState<ApplicationRequest>(initialForm);
  const [error, setError] = useState("");
  useEffect(() => {
    if (existing.data) {
      setForm(existing.data);
    }
  }, [existing.data]);
  const loaded = form;
  const save = useMutation({ mutationFn: (request: ApplicationRequest) => id ? updateApplication(id, request) : createApplication(request), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["applications"] }); navigate("/bewerbungen"); } });

  function update<K extends keyof ApplicationRequest>(field: K, value: ApplicationRequest[K]) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    try { await save.mutateAsync({ ...loaded, technologies: loaded.technologies.map((item) => item.trim()).filter(Boolean) }); } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "Speichern fehlgeschlagen."); }
  }

  return <><PageHeader title={id ? "Bewerbung bearbeiten" : "Neue Bewerbung"} description="Erfassen Sie die wichtigsten Informationen zur Stelle." /><Card><CardBody><form className="grid gap-5 md:grid-cols-2" onSubmit={submit}>
    {error ? <div className="md:col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
    <label className="text-sm font-medium">Firma<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.companyName} onChange={(event) => update("companyName", event.target.value)} required /></label>
    <label className="text-sm font-medium">Jobtitel<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} required /></label>
    <label className="text-sm font-medium">Ort<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.location ?? ""} onChange={(event) => update("location", event.target.value)} /></label>
    <label className="text-sm font-medium">Status<select className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.status} onChange={(event) => update("status", event.target.value as ApplicationRequest["status"])}>{applicationStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-sm font-medium">Bewerbungsdatum<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" type="date" value={loaded.appliedOn ?? ""} onChange={(event) => update("appliedOn", event.target.value || null)} /></label>
    <label className="text-sm font-medium">Arbeitsmodell<select className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.workModel} onChange={(event) => update("workModel", event.target.value as WorkModel)}><option>Unspecified</option><option>OnSite</option><option>Hybrid</option><option>Remote</option></select></label>
    <label className="text-sm font-medium">Beschäftigungsart<select className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.employmentType} onChange={(event) => update("employmentType", event.target.value as EmploymentType)}><option>Unspecified</option><option>FullTime</option><option>PartTime</option><option>Contract</option><option>Internship</option><option>Freelance</option></select></label>
    <label className="text-sm font-medium">Stellenlink<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" type="url" value={loaded.jobPostingUrl ?? ""} onChange={(event) => update("jobPostingUrl", event.target.value)} /></label>
    <label className="text-sm font-medium">Gesprächstermin<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" type="datetime-local" value={toLocalInputValue(loaded.interviewAt)} onChange={(event) => update("interviewAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label>
    <label className="text-sm font-medium">Gesprächsort<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.interviewLocation ?? ""} onChange={(event) => update("interviewLocation", event.target.value)} placeholder="z. B. Videocall oder Adresse" /></label>
    <label className="text-sm font-medium md:col-span-2">Technologien (kommagetrennt)<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3" value={loaded.technologies.join(", ")} onChange={(event) => update("technologies", event.target.value.split(","))} /></label>
    <label className="text-sm font-medium md:col-span-2">Stellenbeschreibung<textarea className="mt-1.5 min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2" value={loaded.jobDescription ?? ""} onChange={(event) => update("jobDescription", event.target.value)} /></label>
    <label className="text-sm font-medium md:col-span-2">Notizen<textarea className="mt-1.5 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2" value={loaded.notes ?? ""} onChange={(event) => update("notes", event.target.value)} /></label>
    <div className="flex gap-3 md:col-span-2"><Link to="/bewerbungen"><Button variant="secondary">Abbrechen</Button></Link><Button type="submit" disabled={save.isPending || Boolean(id && existing.isPending)}>{save.isPending ? "Speichern..." : "Speichern"}</Button></div>
  </form></CardBody></Card></>;
}
