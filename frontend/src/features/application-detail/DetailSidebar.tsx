import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, CalendarDays, Check, MapPin, Plus } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import type { ApplicationDetail } from "@/features/applications/api";
import {
  completeReminder,
  createReminder,
  getReminders,
  reminderTypeLabels,
  type ReminderType,
} from "@/features/reminders/api";
import { ApiError } from "@/lib/api";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const reminderTypes = Object.keys(reminderTypeLabels) as ReminderType[];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function daysSince(dateValue: string | null | undefined): string {
  if (!dateValue) return "–";
  const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
  return days === 1 ? "1 Tag" : `${days} Tage`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function DetailSidebar({ application }: { application: ApplicationDetail }) {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reminderType, setReminderType] = useState<ReminderType>("Custom");
  const [description, setDescription] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [actionError, setActionError] = useState("");

  const reminders = useQuery({
    queryKey: ["reminders", "application", application.id],
    queryFn: () => getReminders("Open", application.id),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["reminders"] });
  }

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeReminder(id),
    onSuccess: refresh,
    onError: (error) => setActionError(errorMessage(error, "Die Erinnerung konnte nicht abgeschlossen werden.")),
  });

  const followUpMutation = useMutation({
    mutationFn: () => {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      due.setHours(9, 0, 0, 0);
      return createReminder({
        title: `Nachfassen: ${application.companyName}`,
        description: null,
        dueAt: due.toISOString(),
        reminderType: "FollowUp",
        jobApplicationId: application.id,
      });
    },
    onSuccess: refresh,
    onError: (error) => setActionError(errorMessage(error, "Die Erinnerung konnte nicht angelegt werden.")),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createReminder({
        title: title.trim(),
        description: description.trim() || null,
        dueAt: new Date(dueAt).toISOString(),
        reminderType,
        jobApplicationId: application.id,
      }),
    onSuccess: () => {
      setDialogOpen(false);
      refresh();
    },
    onError: (error) => setDialogError(errorMessage(error, "Die Erinnerung konnte nicht gespeichert werden.")),
  });

  function openDialog() {
    setTitle("");
    setDueAt("");
    setReminderType("Custom");
    setDescription("");
    setDialogError("");
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !dueAt) {
      setDialogError("Bitte gib einen Titel und ein Fälligkeitsdatum an.");
      return;
    }
    setDialogError("");
    createMutation.mutate();
  }

  const interviewDate = application.interviewAt ? new Date(application.interviewAt) : null;
  const interviewInFuture = interviewDate !== null && interviewDate.getTime() > Date.now();
  const openReminders = reminders.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={CalendarDays} title="Eckdaten" />
        <CardBody>
          <dl className="divide-y divide-border">
            <Row label="Beworben am">{formatDate(application.appliedOn)}</Row>
            <Row label="Tage seit Bewerbung">{daysSince(application.appliedOn)}</Row>
            <Row label="Zuletzt geändert">{formatRelative(application.updatedAt)}</Row>
            <Row label="Angelegt am">{formatDate(application.createdAt)}</Row>
          </dl>
        </CardBody>
      </Card>

      {application.interviewAt ? (
        <Card>
          <CardHeader icon={CalendarClock} title="Nächstes Gespräch" />
          <CardBody className="space-y-1.5 text-sm">
            {interviewInFuture ? (
              <>
                <p className="font-medium">{formatDateTime(application.interviewAt)}</p>
                <p className="text-primary">{formatRelative(application.interviewAt)}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Letztes Gespräch: {formatDateTime(application.interviewAt)}</p>
            )}
            {application.interviewLocation ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{application.interviewLocation}</span>
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader icon={Bell} title="Erinnerungen" />
        <CardBody className="space-y-4">
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}

          {reminders.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : reminders.isError ? (
            <Alert tone="error">Die Erinnerungen konnten nicht geladen werden.</Alert>
          ) : openReminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Erinnerungen.</p>
          ) : (
            <ul className="space-y-3">
              {openReminders.map((reminder) => (
                <li key={reminder.id} className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={`„${reminder.title}“ als erledigt markieren`}
                    title="Als erledigt markieren"
                    disabled={completeMutation.isPending}
                    onClick={() => {
                      setActionError("");
                      completeMutation.mutate(reminder.id);
                    }}
                    className="group mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100" aria-hidden="true" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{reminder.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn(reminder.isOverdue ? "text-destructive" : "text-muted-foreground")}>
                        {formatDateTime(reminder.dueAt)}
                      </span>
                      {reminder.isOverdue ? <Badge tone="danger">Überfällig</Badge> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row xl:flex-col">
            <Button
              variant="secondary"
              size="sm"
              className="sm:flex-1 xl:flex-none"
              loading={followUpMutation.isPending}
              onClick={() => {
                setActionError("");
                followUpMutation.mutate();
              }}
            >
              Nachfassen in 7 Tagen
            </Button>
            <Button variant="outline" size="sm" className="sm:flex-1 xl:flex-none" onClick={openDialog}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Eigene Erinnerung
            </Button>
          </div>
        </CardBody>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Neue Erinnerung"
        description={`${application.companyName} · ${application.jobTitle}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" form="detail-reminder-form" loading={createMutation.isPending}>
              Speichern
            </Button>
          </>
        }
      >
        <form id="detail-reminder-form" className="space-y-4" onSubmit={handleSubmit}>
          {dialogError ? <Alert tone="error">{dialogError}</Alert> : null}
          <Field label="Titel">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
          </Field>
          <Field label="Fällig am">
            <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required />
          </Field>
          <Field label="Art">
            <Select value={reminderType} onChange={(event) => setReminderType(event.target.value as ReminderType)}>
              {reminderTypes.map((type) => (
                <option key={type} value={type}>
                  {reminderTypeLabels[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Beschreibung (optional)">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
