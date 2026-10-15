import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { changeStatus, type ApplicationDetail, type ApplicationStatus } from "@/features/applications/api";
import { applicationStatusOrder, statusConfig } from "@/features/applications/status";
import { ApiError } from "@/lib/api";

/** Statuswechsel mit optionalem Kommentar, der im Verlauf erscheint. */
export function StatusChangeDialog({ application, open, onClose }: { application: ApplicationDetail; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [comment, setComment] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  // Beim Oeffnen auf den aktuellen Status zuruecksetzen (waehrend des Renderns statt im Effekt).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStatus(application.status);
      setComment("");
    }
  }

  const save = useMutation({
    mutationFn: () => changeStatus(application.id, status, comment.trim() || undefined),
    onSuccess: () => {
      for (const key of [["application", application.id], ["applications"], ["summary"], ["statistics"]]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      onClose();
    },
  });

  function close() {
    save.reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Status ändern"
      description={`${application.jobTitle} bei ${application.companyName}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Abbrechen
          </Button>
          <Button loading={save.isPending} disabled={status === application.status} onClick={() => save.mutate()}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Neuer Status" hint={statusConfig[status].description}>
          <Select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus)}>
            {applicationStatusOrder.map((value) => (
              <option key={value} value={value}>
                {statusConfig[value].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kommentar (optional)" hint="Erscheint im Verlauf, z. B. „Einladung per Mail von Frau Meier“.">
          <Textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} />
        </Field>
        {save.isError ? (
          <Alert tone="error">{save.error instanceof ApiError ? save.error.message : "Der Status konnte nicht geändert werden."}</Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
