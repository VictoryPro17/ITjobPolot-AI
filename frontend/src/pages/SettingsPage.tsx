import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, CheckCircle2, Circle, Download, Gauge, KeyRound, Moon, Palette, Settings, ShieldAlert, Sun, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { TagInput } from "@/components/ui/TagInput";
import { Textarea } from "@/components/ui/Textarea";
import { useTheme } from "@/components/theme/useTheme";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  changePassword,
  deleteAvatar,
  extractResumeProfile,
  getAvatarUrl,
  updateProfile,
  uploadAvatar,
  uploadResume,
  type ResumeProfileSuggestion,
} from "@/features/auth/api";
import { ApiError, apiDownload, apiFetch, saveBlob } from "@/lib/api";
import { cropToSquareJpeg } from "@/lib/image";

function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .filter((skill, index, array) => array.indexOf(skill) === index);
}

type ProfileForm = {
  firstName: string;
  lastName: string;
  targetJobTitle: string;
  location: string;
  profileSummary: string;
  experienceSummary: string;
  educationSummary: string;
  resumeText: string;
  skills: string;
};

function mergeSuggestion(
  current: ProfileForm,
  suggestion: ResumeProfileSuggestion,
): { profile: ProfileForm; filledCount: number } {
  const next: ProfileForm = { ...current };
  let filledCount = 0;

  const fields = [
    "firstName",
    "lastName",
    "targetJobTitle",
    "location",
    "profileSummary",
    "experienceSummary",
    "educationSummary",
  ] as const;

  for (const field of fields) {
    const value = suggestion[field];
    if (!current[field].trim() && value && value.trim()) {
      next[field] = value;
      filledCount += 1;
    }
  }

  next.resumeText = suggestion.resumeText;

  const existingSkills = parseSkills(current.skills);
  const seen = new Set(existingSkills.map((skill) => skill.toLowerCase()));
  const merged = [...existingSkills];
  let addedSkill = false;
  for (const skill of suggestion.skills) {
    const trimmed = skill.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      merged.push(trimmed);
      addedSkill = true;
    }
  }
  next.skills = merged.join(", ");
  if (addedSkill) {
    filledCount += 1;
  }

  return { profile: next, filledCount };
}

function isPasswordValid(value: string): boolean {
  return value.length >= 10 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
}

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    targetJobTitle: "",
    location: "",
    profileSummary: "",
    experienceSummary: "",
    educationSummary: "",
    resumeText: "",
    skills: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isAvatarDeleting, setIsAvatarDeleting] = useState(false);
  const [avatarRemoveOpen, setAvatarRemoveOpen] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiFetch<void>("/auth/account", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) }),
    onSuccess: () => {
      queryClient.clear();
      navigate("/anmelden", { replace: true });
    },
    onError: (error) => setDeleteError(error instanceof ApiError ? error.message : "Das Konto konnte nicht gelöscht werden."),
  });

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setAvatarError("");
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("Die Datei ist zu groß.");
      input.value = "";
      return;
    }

    setIsAvatarUploading(true);
    try {
      const blob = await cropToSquareJpeg(file);
      const updated = await uploadAvatar(blob);
      queryClient.setQueryData(["auth", "me"], updated);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Das Profilbild konnte nicht hochgeladen werden.");
    } finally {
      setIsAvatarUploading(false);
      input.value = "";
    }
  }

  async function handleAvatarRemove() {
    setAvatarError("");
    setIsAvatarDeleting(true);
    try {
      const updated = await deleteAvatar();
      queryClient.setQueryData(["auth", "me"], updated);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Das Profilbild konnte nicht entfernt werden.");
    } finally {
      setIsAvatarDeleting(false);
      setAvatarRemoveOpen(false);
    }
  }

  async function handleExport() {
    setExportError("");
    setIsExporting(true);
    try {
      const { blob, fileName } = await apiDownload("/auth/export");
      saveBlob(blob, fileName);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.message : "Der Datenexport ist fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  }

  function closeDeleteDialog() {
    setDeleteOpen(false);
    setDeletePassword("");
    setDeleteError("");
  }

  // Nur die gespeicherten Profildaten bestimmen den Formularstand. Ein neues Profilbild
  // aktualisiert zwar den Benutzer, darf aber ungespeicherte Eingaben nicht verwerfen.
  const savedProfileKey = user
    ? JSON.stringify([
        user.firstName,
        user.lastName,
        user.targetJobTitle,
        user.location,
        user.profileSummary,
        user.experienceSummary,
        user.educationSummary,
        user.resumeText,
        user.skills,
      ])
    : "";

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        targetJobTitle: user.targetJobTitle ?? "",
        location: user.location ?? "",
        profileSummary: user.profileSummary ?? "",
        experienceSummary: user.experienceSummary ?? "",
        educationSummary: user.educationSummary ?? "",
        resumeText: user.resumeText ?? "",
        skills: user.skills.join(", "),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur bei geänderten Profildaten
  }, [savedProfileKey]);

  const profileMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        firstName: profile.firstName.trim() || null,
        lastName: profile.lastName.trim() || null,
        targetJobTitle: profile.targetJobTitle.trim() || null,
        location: profile.location.trim() || null,
        profileSummary: profile.profileSummary.trim() || null,
        experienceSummary: profile.experienceSummary.trim() || null,
        educationSummary: profile.educationSummary.trim() || null,
        resumeText: profile.resumeText.trim() || null,
        skills: parseSkills(profile.skills),
        themePreference: theme,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      setProfileMessage("Profil wurde gespeichert.");
      setHasUnsavedChanges(false);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    onSuccess: () => {
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Passwort wurde geaendert.");
    },
  });

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");

    try {
      await profileMutation.mutateAsync();
    } catch (error) {
      setProfileError(error instanceof ApiError ? error.message : "Profil konnte nicht gespeichert werden.");
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (!isPasswordValid(passwords.newPassword)) {
      setPasswordError("Das Passwort muss mindestens 10 Zeichen lang sein, Gross- und Kleinbuchstaben sowie eine Ziffer enthalten.");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("Die neuen Passwoerter stimmen nicht ueberein.");
      return;
    }

    try {
      await passwordMutation.mutateAsync();
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.message : "Passwort konnte nicht geaendert werden.");
    }
  }

  function applySuggestion(suggestion: ResumeProfileSuggestion) {
    const { profile: merged, filledCount } = mergeSuggestion(profile, suggestion);
    setProfile(merged);
    setHasUnsavedChanges(true);
    setProfileMessage(
      `Lebenslauf ausgelesen – ${filledCount} Felder vorausgefüllt. Bereits ausgefüllte Felder wurden nicht überschrieben. Bitte prüfen und mit „Profil speichern“ übernehmen.`,
    );
  }

  async function handleResumeFile(file: File) {
    setProfileError("");
    setProfileMessage("");
    setIsUploading(true);
    setResumeFileName(file.name);

    try {
      const suggestion = await uploadResume(file);
      applySuggestion(suggestion);
    } catch (error) {
      setProfileError(error instanceof ApiError ? error.message : "Der Lebenslauf konnte nicht verarbeitet werden.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleExtractFromText() {
    if (!profile.resumeText.trim()) {
      setProfileError("Bitte erst einen Lebenslauf-Text eingeben.");
      return;
    }

    setProfileError("");
    setProfileMessage("");
    setIsExtracting(true);

    try {
      const suggestion = await extractResumeProfile(profile.resumeText);
      applySuggestion(suggestion);
    } catch (error) {
      setProfileError(error instanceof ApiError ? error.message : "Der Lebenslauf-Text konnte nicht ausgewertet werden.");
    } finally {
      setIsExtracting(false);
    }
  }

  function setField(key: keyof ProfileForm, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
    setHasUnsavedChanges(true);
  }

  const completeness = [
    { label: "Vorname", done: Boolean(profile.firstName.trim()) },
    { label: "Nachname", done: Boolean(profile.lastName.trim()) },
    { label: "Wunschposition", done: Boolean(profile.targetJobTitle.trim()) },
    { label: "Standort", done: Boolean(profile.location.trim()) },
    { label: "Profilzusammenfassung", done: Boolean(profile.profileSummary.trim()) },
    { label: "Berufserfahrung", done: Boolean(profile.experienceSummary.trim()) },
    { label: "Ausbildung", done: Boolean(profile.educationSummary.trim()) },
    { label: "Lebenslauf-Text", done: Boolean(profile.resumeText.trim()) },
    { label: "Skills", done: parseSkills(profile.skills).length > 0 },
  ];
  const percent = Math.round((completeness.filter((item) => item.done).length / completeness.length) * 100);
  const missing = completeness.filter((item) => !item.done);

  const limitedFields = [
    { key: "profileSummary", label: "Profilzusammenfassung" },
    { key: "experienceSummary", label: "Berufserfahrung" },
    { key: "educationSummary", label: "Ausbildung / Lernpfad" },
  ] as const;

  const themeOptions = [
    { value: "light", label: "Hell", Icon: Sun },
    { value: "dark", label: "Dunkel", Icon: Moon },
  ] as const;

  return (
    <>
      <PageHeader icon={Settings} title="Einstellungen" description="Profil, Darstellung und Sicherheit verwalten." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader icon={UserRound} title="Profil" description={user?.email} />
          <CardBody>
            <form className="space-y-8" onSubmit={submitProfile}>
              {profileError ? <Alert tone="error">{profileError}</Alert> : null}
              {profileMessage ? <Alert tone="success">{profileMessage}</Alert> : null}

              <div>
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar name={user?.displayName || user?.email || ""} src={getAvatarUrl(user)} size="lg" />
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Profilbild</p>
                      <p className="text-xs text-muted-foreground">PNG oder JPG, wird quadratisch auf 256 × 256 px zugeschnitten.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        className="hidden"
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={(event) => void handleAvatarChange(event)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={isAvatarUploading}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                        Bild hochladen
                      </Button>
                      {user?.avatarVersion != null ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarRemoveOpen(true)}>
                          <Trash2 className="h-4 w-4" />
                          Entfernen
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {avatarError ? (
                  <Alert tone="error" className="mt-3">
                    {avatarError}
                  </Alert>
                ) : null}
              </div>

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Persönliche Daten</h3>
                  <p className="text-xs text-muted-foreground">Wird für Anschreiben und Match-Analyse verwendet.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vorname">
                    <Input value={profile.firstName} onChange={(event) => setField("firstName", event.target.value)} />
                  </Field>
                  <Field label="Nachname">
                    <Input value={profile.lastName} onChange={(event) => setField("lastName", event.target.value)} />
                  </Field>
                  <Field label="Wunschposition">
                    <Input value={profile.targetJobTitle} onChange={(event) => setField("targetJobTitle", event.target.value)} />
                  </Field>
                  <Field label="Standort">
                    <Input value={profile.location} onChange={(event) => setField("location", event.target.value)} />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Lebenslauf</h3>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT oder MD, max. 10 MB. Nichts wird ohne deine Bestätigung gespeichert.
                  </p>
                </div>
                <FileDropzone
                  accept=".pdf,.docx,.txt,.md"
                  hint="PDF, DOCX, TXT oder MD, max. 10 MB"
                  loading={isUploading}
                  fileName={resumeFileName}
                  disabled={isExtracting}
                  onFile={(file) => void handleResumeFile(file)}
                />
                <details className="group rounded-lg border border-border">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-primary">
                    Lebenslauf-Text anzeigen oder einfügen
                  </summary>
                  <div className="space-y-3 border-t border-border p-3">
                    <Textarea
                      className="min-h-48"
                      value={profile.resumeText}
                      onChange={(event) => setField("resumeText", event.target.value)}
                      placeholder="Hier den kompletten Lebenslauf-Text einfügen oder hochladen..."
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isExtracting}
                        disabled={isUploading}
                        onClick={() => void handleExtractFromText()}
                      >
                        Aus Text ableiten
                      </Button>
                    </div>
                  </div>
                </details>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Profil-Details</h3>
                  <p className="text-xs text-muted-foreground">Grundlage für Erfahrung und Ausbildung im Match.</p>
                </div>
                {limitedFields.map(({ key, label }) => {
                  const value = profile[key];
                  const tooLong = value.length > 2000;
                  return (
                    <Field
                      key={key}
                      label={label}
                      hint={`${value.length}/2000`}
                      error={tooLong ? "Maximal 2000 Zeichen." : undefined}
                    >
                      <Textarea
                        className="min-h-28"
                        invalid={tooLong}
                        value={value}
                        onChange={(event) => setField(key, event.target.value)}
                      />
                    </Field>
                  );
                })}
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Skills</h3>
                  <p className="text-xs text-muted-foreground">Enter oder Komma fügt einen Skill hinzu.</p>
                </div>
                <TagInput
                  value={parseSkills(profile.skills)}
                  onChange={(tags) => {
                    setProfile((current) => ({ ...current, skills: tags.join(", ") }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="z. B. C#, React, Azure"
                />
              </section>

              <div className="sticky bottom-0 -mx-5 -mb-4 mt-6 flex items-center justify-between gap-3 rounded-b-xl border-t border-border bg-card/95 px-5 py-3 backdrop-blur">
                {hasUnsavedChanges ? (
                  <span className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Ungespeicherte Änderungen
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Alle Änderungen gespeichert</span>
                )}
                <Button type="submit" loading={profileMutation.isPending}>
                  Profil speichern
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={Gauge} title="Profil-Vollständigkeit" />
            <CardBody className="space-y-3">
              <div className="text-3xl font-semibold tabular-nums">{percent}%</div>
              <Progress value={percent} tone={percent >= 80 ? "success" : percent >= 50 ? "primary" : "warning"} />
              {missing.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {missing.map((item) => (
                    <li key={item.label} className="flex items-center gap-2">
                      <Circle className="h-3.5 w-3.5" />
                      {item.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Dein Profil ist vollständig.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={KeyRound}
              title="Passwort aendern"
              description="Mindestens 10 Zeichen mit Gross- und Kleinbuchstaben sowie einer Ziffer."
            />
            <CardBody>
              <form className="grid gap-4" onSubmit={submitPassword}>
                {passwordError ? <Alert tone="error">{passwordError}</Alert> : null}
                {passwordMessage ? <Alert tone="success">{passwordMessage}</Alert> : null}

                <Field label="Aktuelles Passwort">
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={passwords.currentPassword}
                    onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                    required
                  />
                </Field>
                <Field label="Neues Passwort">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwords.newPassword}
                    onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                    required
                  />
                </Field>
                <Field label="Neues Passwort bestaetigen">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                    required
                  />
                </Field>

                <div>
                  <Button type="submit" loading={passwordMutation.isPending}>
                    Passwort aendern
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={Palette}
              title="Darstellung"
              description="Die Auswahl wird lokal gespeichert und beim nächsten Speichern des Profils übernommen."
            />
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                {themeOptions.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors ${
                      theme === value
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={ShieldAlert} title="Daten & Konto" description="Export und Löschung gemäß DSGVO." />
            <CardBody className="space-y-4">
              <p className="text-sm text-muted-foreground">Lade alle deine Daten als JSON-Datei herunter.</p>
              {exportError ? <Alert tone="error">{exportError}</Alert> : null}
              <Button variant="outline" loading={isExporting} onClick={() => void handleExport()}>
                <Download className="h-4 w-4" />
                Daten exportieren
              </Button>

              <hr className="border-border" />

              <p className="text-sm text-muted-foreground">
                Das Konto und alle Bewerbungen, Dokumente und Erinnerungen werden endgültig gelöscht.
              </p>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Konto löschen
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        tone="destructive"
        title="Konto endgültig löschen?"
        description="Dieser Schritt kann nicht rückgängig gemacht werden."
        confirmLabel="Endgültig löschen"
        loading={deleteAccountMutation.isPending}
        disabled={!deletePassword}
        onConfirm={() => {
          setDeleteError("");
          deleteAccountMutation.mutate();
        }}
        onCancel={closeDeleteDialog}
      >
        <div className="space-y-4">
          {deleteError ? <Alert tone="error">{deleteError}</Alert> : null}
          <Field label="Aktuelles Passwort">
            <Input
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={avatarRemoveOpen}
        tone="destructive"
        title="Profilbild entfernen?"
        description="Das Bild wird gelöscht."
        confirmLabel="Entfernen"
        loading={isAvatarDeleting}
        onConfirm={() => void handleAvatarRemove()}
        onCancel={() => setAvatarRemoveOpen(false)}
      />
    </>
  );
}
