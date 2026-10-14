import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { useAuth } from "@/features/auth/AuthProvider";
import { deleteAvatar, getAvatarUrl, uploadAvatar } from "@/features/auth/api";
import { SaveBar, SettingRow, SettingsSection } from "@/features/settings/SettingsLayout";
import type { CompletenessItem, ProfileFormState } from "@/features/settings/useProfileForm";
import { cropToSquareJpeg } from "@/lib/image";

/** Kompakte Vollstaendigkeitsanzeige; jede fehlende Angabe springt zum passenden Feld. */
export function CompletenessCard({
  percent,
  items,
  onJump,
}: {
  percent: number;
  items: CompletenessItem[];
  onJump: (item: CompletenessItem) => void;
}) {
  const missing = items.filter((item) => !item.done);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Profil-Vollständigkeit</p>
        <p className="text-sm text-muted-foreground">
          <span className="text-lg font-semibold tabular-nums text-foreground">{percent} %</span>
          {missing.length > 0 ? ` · ${missing.length} ${missing.length === 1 ? "Angabe fehlt" : "Angaben fehlen"}` : null}
        </p>
      </div>
      <Progress
        className="mt-3"
        label="Profil-Vollständigkeit"
        value={percent}
        tone={percent >= 80 ? "success" : percent >= 50 ? "primary" : "warning"}
      />
      {missing.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {missing.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onJump(item)}
              className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              + {item.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Dein Profil ist vollständig – das verbessert Match-Analyse und Anschreiben.
        </p>
      )}
    </div>
  );
}

export function ProfileSection({ form }: { form: ProfileFormState }) {
  const { user, profile, setField } = form;

  return (
    <SettingsSection
      title="Profil"
      description="Diese Angaben nutzt JobPilot für Anschreiben und die Match-Analyse."
      footer={<SaveBar dirty={form.hasUnsavedChanges} saving={form.isSaving} disabled={!form.canSave} onSave={form.save} onDiscard={form.discard} />}
    >
      {form.error ? <Alert tone="error" className="my-4">{form.error}</Alert> : null}
      {form.message ? <Alert tone="success" className="my-4">{form.message}</Alert> : null}

      <AvatarRow />

      <SettingRow label="Name" description="Erscheint in Anschreiben und in der Begrüßung.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-firstName" className="sr-only">
              Vorname
            </label>
            <Input id="settings-firstName" placeholder="Vorname" autoComplete="given-name" value={profile.firstName} onChange={(event) => setField("firstName", event.target.value)} />
          </div>
          <div>
            <label htmlFor="settings-lastName" className="sr-only">
              Nachname
            </label>
            <Input id="settings-lastName" placeholder="Nachname" autoComplete="family-name" value={profile.lastName} onChange={(event) => setField("lastName", event.target.value)} />
          </div>
        </div>
      </SettingRow>

      <SettingRow label="Wunschposition" htmlFor="settings-targetJobTitle" description="Hilft der Analyse, passende Stellen zu erkennen.">
        <Input id="settings-targetJobTitle" placeholder="z. B. Junior Backend Developer" value={profile.targetJobTitle} onChange={(event) => setField("targetJobTitle", event.target.value)} />
      </SettingRow>

      <SettingRow label="Standort" htmlFor="settings-location">
        <Input id="settings-location" placeholder="z. B. Berlin" autoComplete="address-level2" value={profile.location} onChange={(event) => setField("location", event.target.value)} />
      </SettingRow>

      <SettingRow label="E-Mail-Adresse" description="Wird für die Anmeldung verwendet und kann nicht geändert werden.">
        <p className="flex h-10 items-center text-sm text-muted-foreground">{user?.email}</p>
      </SettingRow>
    </SettingsSection>
  );
}

/** Profilbild: wird sofort gespeichert und beruehrt ungespeicherte Formulareingaben nicht. */
function AvatarRow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Die Datei ist zu groß.");
      input.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const updated = await uploadAvatar(await cropToSquareJpeg(file));
      queryClient.setQueryData(["auth", "me"], updated);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Das Profilbild konnte nicht hochgeladen werden.");
    } finally {
      setIsUploading(false);
      input.value = "";
    }
  }

  async function handleRemove() {
    setError("");
    setIsDeleting(true);
    try {
      queryClient.setQueryData(["auth", "me"], await deleteAvatar());
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Das Profilbild konnte nicht entfernt werden.");
    } finally {
      setIsDeleting(false);
      setRemoveOpen(false);
    }
  }

  return (
    <SettingRow label="Profilbild" description="PNG oder JPG. Wird quadratisch auf 256 × 256 px zugeschnitten und sofort gespeichert.">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user?.displayName || user?.email || ""} src={getAvatarUrl(user)} size="lg" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={(event) => void handleChange(event)}
          />
          <Button type="button" variant="outline" size="sm" loading={isUploading} onClick={() => inputRef.current?.click()}>
            <Camera className="h-4 w-4" />
            {user?.avatarVersion != null ? "Ändern" : "Hochladen"}
          </Button>
          {user?.avatarVersion != null ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Entfernen
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <ConfirmDialog
        open={removeOpen}
        tone="destructive"
        title="Profilbild entfernen?"
        description="Das Bild wird gelöscht."
        confirmLabel="Entfernen"
        loading={isDeleting}
        onConfirm={() => void handleRemove()}
        onCancel={() => setRemoveOpen(false)}
      />
    </SettingRow>
  );
}
