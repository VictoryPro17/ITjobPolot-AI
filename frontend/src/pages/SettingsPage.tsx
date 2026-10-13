import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/theme/useTheme";
import { useAuth } from "@/features/auth/AuthProvider";
import { changePassword, updateProfile } from "@/features/auth/api";
import { ApiError } from "@/lib/api";

const fieldClass = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState({ firstName: "", lastName: "", targetJobTitle: "", location: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        targetJobTitle: user.targetJobTitle ?? "",
        location: user.location ?? "",
      });
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        firstName: profile.firstName.trim() || null,
        lastName: profile.lastName.trim() || null,
        targetJobTitle: profile.targetJobTitle.trim() || null,
        location: profile.location.trim() || null,
        themePreference: theme,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      setProfileMessage("Profil wurde gespeichert.");
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

  return (
    <>
      <PageHeader title="Einstellungen" description="Profil, Darstellung und Sicherheit verwalten." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profil" description={user?.email} />
          <CardBody>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitProfile}>
              {profileError ? (
                <p className="sm:col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{profileError}</p>
              ) : null}
              {profileMessage ? (
                <p className="sm:col-span-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{profileMessage}</p>
              ) : null}

              <label className="text-sm font-medium">
                Vorname
                <input
                  className={fieldClass}
                  value={profile.firstName}
                  onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))}
                />
              </label>
              <label className="text-sm font-medium">
                Nachname
                <input
                  className={fieldClass}
                  value={profile.lastName}
                  onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))}
                />
              </label>
              <label className="text-sm font-medium">
                Wunschposition
                <input
                  className={fieldClass}
                  value={profile.targetJobTitle}
                  onChange={(event) => setProfile((current) => ({ ...current, targetJobTitle: event.target.value }))}
                />
              </label>
              <label className="text-sm font-medium">
                Standort
                <input
                  className={fieldClass}
                  value={profile.location}
                  onChange={(event) => setProfile((current) => ({ ...current, location: event.target.value }))}
                />
              </label>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? "Speichern..." : "Profil speichern"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Passwort aendern" description="Mindestens 8 Zeichen mit Gross- und Kleinbuchstaben sowie einer Ziffer." />
          <CardBody>
            <form className="grid gap-4" onSubmit={submitPassword}>
              {passwordError ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{passwordError}</p>
              ) : null}
              {passwordMessage ? (
                <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{passwordMessage}</p>
              ) : null}

              <label className="text-sm font-medium">
                Aktuelles Passwort
                <input
                  className={fieldClass}
                  type="password"
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Neues Passwort
                <input
                  className={fieldClass}
                  type="password"
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Neues Passwort bestaetigen
                <input
                  className={fieldClass}
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                  required
                />
              </label>

              <div>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Aendern..." : "Passwort aendern"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Darstellung" description="Die Auswahl wird lokal gespeichert und beim Profil hinterlegt." />
          <CardBody>
            <div className="flex gap-3">
              <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>
                Hell
              </Button>
              <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>
                Dunkel
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}