import { useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MessageSquareText, Sparkles, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import {
  createApplicationNote,
  deleteApplicationNote,
  getApplicationNotes,
  type ApplicationDetail,
  type ApplicationNote,
  type StatusHistoryEntry,
} from "@/features/applications/api";
import { statusConfig } from "@/features/applications/status";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";

const MAX_NOTE_LENGTH = 4000;

type TimelineEvent =
  | { kind: "status"; at: string; entry: StatusHistoryEntry }
  | { kind: "note"; at: string; note: ApplicationNote }
  | { kind: "created"; at: string };

export function notesQueryKey(applicationId: string) {
  return ["application", applicationId, "notes"] as const;
}

/** Gemeinsame Zeitleiste aus Statuswechseln und Notizen, neueste oben. */
export function ActivityTab({ application }: { application: ApplicationDetail }) {
  const queryClient = useQueryClient();
  const notesKey = notesQueryKey(application.id);
  const notes = useQuery({ queryKey: notesKey, queryFn: () => getApplicationNotes(application.id) });
  const [draft, setDraft] = useState("");
  const [toDelete, setToDelete] = useState<ApplicationNote | null>(null);

  const create = useMutation({
    mutationFn: (content: string) => createApplicationNote(application.id, content),
    onSuccess: (note) => {
      queryClient.setQueryData<ApplicationNote[]>(notesKey, (current) => [note, ...(current ?? [])]);
      setDraft("");
    },
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => deleteApplicationNote(application.id, noteId),
    onSuccess: (_result, noteId) => {
      queryClient.setQueryData<ApplicationNote[]>(notesKey, (current) => (current ?? []).filter((note) => note.id !== noteId));
      setToDelete(null);
    },
  });

  function submit() {
    const content = draft.trim();
    if (content && content.length <= MAX_NOTE_LENGTH && !create.isPending) {
      create.mutate(content);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  }

  const events: TimelineEvent[] = [
    ...application.statusHistory.map((entry) => ({ kind: "status" as const, at: entry.changedAt, entry })),
    ...(notes.data ?? []).map((note) => ({ kind: "note" as const, at: note.createdAt, note })),
  ];
  // Der allererste Statuseintrag ist das Anlegen; fehlt er (Altdaten), das Anlagedatum ergaenzen.
  if (!application.statusHistory.some((entry) => entry.fromStatus == null)) {
    events.push({ kind: "created", at: application.createdAt });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const tooLong = draft.length > MAX_NOTE_LENGTH;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="space-y-3">
          <label htmlFor="new-note" className="text-sm font-medium">
            Neue Notiz
          </label>
          <Textarea
            id="new-note"
            value={draft}
            invalid={tooLong}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="z. B. Telefonat mit Frau Meier – Rückmeldung bis Freitag"
          />
          {create.isError ? (
            <Alert tone="error">{create.error instanceof ApiError ? create.error.message : "Die Notiz konnte nicht gespeichert werden."}</Alert>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {tooLong ? `Höchstens ${MAX_NOTE_LENGTH.toLocaleString("de-DE")} Zeichen.` : "Strg + Enter speichert"}
            </span>
            <Button size="sm" onClick={submit} loading={create.isPending} disabled={!draft.trim() || tooLong}>
              Notiz speichern
            </Button>
          </div>
        </CardBody>
      </Card>

      {notes.isError ? <Alert tone="error">Die Notizen konnten nicht geladen werden.</Alert> : null}

      {notes.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <ol className="relative space-y-5 border-l border-border pl-6">
          {events.map((event) => (
            <li key={event.kind === "status" ? `s-${event.entry.id}` : event.kind === "note" ? `n-${event.note.id}` : "created"} className="relative">
              <TimelineDot event={event} />
              {event.kind === "note" ? (
                <div className="group rounded-lg border border-border bg-card p-3 shadow-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground" title={formatDateTime(event.at)}>
                      Notiz · {formatRelative(event.at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setToDelete(event.note)}
                      aria-label="Notiz löschen"
                      className="rounded p-1 text-muted-foreground opacity-100 hover:bg-muted hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{event.note.content}</p>
                </div>
              ) : event.kind === "status" ? (
                <StatusEvent entry={event.entry} />
              ) : (
                <p className="text-sm">
                  Bewerbung angelegt <span className="text-xs text-muted-foreground">· {formatDateTime(event.at)}</span>
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={toDelete != null}
        title="Notiz löschen?"
        description="Die Notiz wird endgültig entfernt."
        confirmLabel="Löschen"
        tone="destructive"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      >
        {remove.isError ? <Alert tone="error">Die Notiz konnte nicht gelöscht werden.</Alert> : null}
      </ConfirmDialog>
    </div>
  );
}

function TimelineDot({ event }: { event: TimelineEvent }) {
  const base = "absolute -left-[33px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-background";
  if (event.kind === "note") {
    return (
      <span className={`${base} bg-muted text-muted-foreground`} aria-hidden="true">
        <MessageSquareText className="h-3 w-3" />
      </span>
    );
  }
  if (event.kind === "created") {
    return (
      <span className={`${base} bg-muted text-muted-foreground`} aria-hidden="true">
        <Sparkles className="h-3 w-3" />
      </span>
    );
  }
  const config = statusConfig[event.entry.toStatus];
  const Icon = config.icon;
  return (
    <span className={base} style={{ background: config.colorVar, color: "white" }} aria-hidden="true">
      <Icon className="h-3 w-3" />
    </span>
  );
}

function StatusEvent({ entry }: { entry: StatusHistoryEntry }) {
  const to = statusConfig[entry.toStatus];
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-1.5 text-sm">
        {entry.fromStatus == null ? (
          <>
            Angelegt als <span className="font-medium">{to.label}</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">{statusConfig[entry.fromStatus].label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="zu" />
            <span className="font-medium">{to.label}</span>
          </>
        )}
        <span className="text-xs text-muted-foreground" title={formatDateTime(entry.changedAt)}>
          · {formatRelative(entry.changedAt)}
        </span>
      </p>
      {entry.comment ? <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">„{entry.comment}“</p> : null}
    </div>
  );
}
