import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { getApplications } from "@/features/applications/api";
import {
  completeReminder,
  createReminder,
  deleteReminder,
  getReminders,
  reminderTypeLabels,
  reopenReminder,
  updateReminder,
  type Reminder,
  type ReminderFilter,
  type ReminderType,
} from "@/features/reminders/api";
import { ApiError } from "@/lib/api";

const reminderTypes = Object.keys(reminderTypeLabels) as ReminderType[];

const typeTones: Record<ReminderType, "primary" | "warning" | "neutral"> = {
  Interview: "primary",
  Deadline: "warning",
  FollowUp: "neutral",
  Custom: "neutral",
};

const relativeFormat = new Intl.RelativeTimeFormat("de", { numeric: "auto" });

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultDueInput(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toLocalInput(date);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function relativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = diffMs / 60000;
  if (Math.abs(minutes) < 60) return relativeFormat.format(Math.round(minutes), "minute");
  const hours = minutes / 60;
  if (Math.abs(hours) < 24) return relativeFormat.format(Math.round(hours), "hour");
  return relativeFormat.format(Math.round(hours / 24), "day");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

interface ReminderForm {
  title: string;
  description: string;
  dueAt: string;
  reminderType: ReminderType;
  jobApplicationId: string;
}

function emptyForm(): ReminderForm {
  return { title: "", description: "", dueAt: defaultDueInput(), reminderType: "Custom", jobApplicationId: "" };
}

export function RemindersPage() {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<ReminderFilter>("Open");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReminderForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const [actionError, setActionError] = useState("");

  const reminders = useQuery({ queryKey: ["reminders", filter], queryFn: () => getReminders(filter) });
  const applications = useQuery({
    queryKey: ["applications", "options"],
    queryFn: () => getApplications({ search: "", status: "", page: 1, pageSize: 100 }),
  });
  const applicationOptions = applications.data?.items ?? [];

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["reminders"] });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueAt: new Date(form.dueAt).toISOString(),
        reminderType: form.reminderType,
        jobApplicationId: form.jobApplicationId || null,
      };
      return editingId ? updateReminder(editingId, payload) : createReminder(payload);
    },
    onSuccess: () => {
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => setFormError(errorMessage(error, "Die Erinnerung konnte nicht gespeichert werden.")),
  });

  const toggleMutation = useMutation({
    mutationFn: (reminder: Reminder) => (reminder.isCompleted ? reopenReminder(reminder.id) : completeReminder(reminder.id)),
    onSuccess: invalidate,
    onError: (error) => setActionError(errorMessage(error, "Die Erinnerung konnte nicht aktualisiert werden.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReminder(deleting!.id),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
    onError: (error) => {
      setDeleting(null);
      setActionError(errorMessage(error, "Die Erinnerung konnte nicht gelöscht werden."));
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(reminder: Reminder) {
    setEditingId(reminder.id);
    setForm({
      title: reminder.title,
      description: reminder.description ?? "",
      dueAt: toLocalInput(new Date(reminder.dueAt)),
      reminderType: reminder.reminderType,
      jobApplicationId: reminder.jobApplicationId ?? "",
    });
    setFormError("");
    setFormOpen(true);
  }

  function submit() {
    if (!form.title.trim()) {
      setFormError("Bitte einen Titel eingeben.");
      return;
    }
    if (!form.dueAt || Number.isNaN(new Date(form.dueAt).getTime())) {
      setFormError("Bitte ein gültiges Fälligkeitsdatum angeben.");
      return;
    }
    setFormError("");
    saveMutation.mutate();
  }

  const items = reminders.data ?? [];

  const groups = (() => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8);

    const overdue: Reminder[] = [];
    const todayItems: Reminder[] = [];
    const week: Reminder[] = [];
    const later: Reminder[] = [];

    for (const reminder of items) {
      const due = new Date(reminder.dueAt);
      if (reminder.isOverdue) overdue.push(reminder);
      else if (due >= today && due < tomorrow) todayItems.push(reminder);
      else if (due >= tomorrow && due < weekEnd) week.push(reminder);
      else later.push(reminder);
    }

    return [
      { key: "overdue", title: "Überfällig", destructive: true, items: overdue },
      { key: "today", title: "Heute", destructive: false, items: todayItems },
      { key: "week", title: "Nächste 7 Tage", destructive: false, items: week },
      { key: "later", title: "Später", destructive: false, items: later },
    ].filter((group) => group.items.length > 0);
  })();

  function renderReminder(reminder: Reminder) {
    return (
      <li key={reminder.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
        <button
          type="button"
          aria-label={reminder.isCompleted ? "Wieder öffnen" : "Als erledigt markieren"}
          disabled={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate(reminder)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            reminder.isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
          }`}
        >
          {reminder.isCompleted ? <Check className="h-3 w-3" /> : null}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={`text-sm font-medium ${reminder.isCompleted ? "text-muted-foreground line-through" : ""}`}>{reminder.title}</p>
          {reminder.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{reminder.description}</p> : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {relativeTime(reminder.dueAt)} · {new Date(reminder.dueAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <Badge tone={typeTones[reminder.reminderType]}>{reminderTypeLabels[reminder.reminderType]}</Badge>
            {reminder.isOverdue ? <Badge tone="danger">Überfällig</Badge> : null}
            {reminder.jobApplicationId && reminder.jobApplicationLabel ? (
              <Link to={`/bewerbungen/${reminder.jobApplicationId}`} className="text-primary hover:underline">
                {reminder.jobApplicationLabel}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => openEdit(reminder)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Löschen" className="text-destructive" onClick={() => setDeleting(reminder)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </li>
    );
  }

  return (
    <>
      <PageHeader
        icon={Bell}
        title="Erinnerungen"
        description="Termine, Fristen und Nachfassaktionen im Blick behalten."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Neue Erinnerung
          </Button>
        }
      />

      <div className="space-y-4">
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: "Open", label: "Offen" },
            { value: "Completed", label: "Erledigt" },
            { value: "All", label: "Alle" },
          ]}
        />

        {actionError ? <Alert tone="error">{actionError}</Alert> : null}
        {reminders.isError ? <Alert tone="error">Die Erinnerungen konnten nicht geladen werden.</Alert> : null}

        {reminders.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === "Completed" ? "Noch nichts erledigt" : "Keine offenen Erinnerungen"}
            description={
              filter === "Completed" ? "Erledigte Erinnerungen erscheinen hier." : "Lege Fristen, Gesprächstermine oder Nachfassaktionen an."
            }
          />
        ) : filter === "Open" ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <h2 className={`text-sm font-semibold ${group.destructive ? "text-destructive" : ""}`}>
                  {group.title} <span className="font-normal text-muted-foreground">({group.items.length})</span>
                </h2>
                <ul className="space-y-2">{group.items.map(renderReminder)}</ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="space-y-2">{items.map(renderReminder)}</ul>
        )}
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Erinnerung bearbeiten" : "Neue Erinnerung"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Abbrechen
            </Button>
            <Button loading={saveMutation.isPending} onClick={submit}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          <Field label="Titel">
            <Input value={form.title} required onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </Field>
          <Field label="Beschreibung">
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>
          <Field label="Fällig am">
            <Input
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
            />
          </Field>
          <Field label="Typ">
            <Select
              value={form.reminderType}
              onChange={(event) => setForm((current) => ({ ...current, reminderType: event.target.value as ReminderType }))}
            >
              {reminderTypes.map((type) => (
                <option key={type} value={type}>
                  {reminderTypeLabels[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bewerbung (optional)">
            <Select
              value={form.jobApplicationId}
              onChange={(event) => setForm((current) => ({ ...current, jobApplicationId: event.target.value }))}
            >
              <option value="">Keine Zuordnung</option>
              {applicationOptions.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.companyName} · {application.jobTitle}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        tone="destructive"
        title="Erinnerung löschen?"
        description={`„${deleting?.title ?? ""}“ wird dauerhaft gelöscht.`}
        confirmLabel="Löschen"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
