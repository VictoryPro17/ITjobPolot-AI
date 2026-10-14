import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Eye, EyeOff, X } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changePassword } from "@/features/auth/api";
import { SettingRow, SettingsSection } from "@/features/settings/SettingsLayout";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const emptyPasswords = { currentPassword: "", newPassword: "", confirmPassword: "" };

function passwordRules(newPassword: string, confirmPassword: string) {
  return [
    { label: "Mindestens 10 Zeichen", met: newPassword.length >= 10 },
    { label: "Ein Großbuchstabe", met: /[A-Z]/.test(newPassword) },
    { label: "Ein Kleinbuchstabe", met: /[a-z]/.test(newPassword) },
    { label: "Eine Ziffer", met: /[0-9]/.test(newPassword) },
    { label: "Beide Eingaben stimmen überein", met: newPassword.length > 0 && newPassword === confirmPassword },
  ];
}

export function SecuritySection() {
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const rules = passwordRules(passwords.newPassword, passwords.confirmPassword);
  const allMet = rules.every((rule) => rule.met);

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    onSuccess: () => {
      setPasswords(emptyPasswords);
      setMessage("Dein Passwort wurde geändert.");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (allMet && passwords.currentPassword) {
      mutation.mutate();
    }
  }

  function update(key: keyof typeof emptyPasswords, value: string) {
    setPasswords((current) => ({ ...current, [key]: value }));
    setMessage("");
    mutation.reset();
  }

  const inputType = visible ? "text" : "password";

  return (
    <form onSubmit={submit} noValidate>
      <SettingsSection
        title="Sicherheit"
        description="Ändere dein Passwort. Zur Bestätigung brauchst du dein aktuelles Passwort."
        footer={
          <>
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              className="mr-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              aria-pressed={visible}
            >
              {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {visible ? "Passwörter verbergen" : "Passwörter anzeigen"}
            </button>
            <Button type="submit" size="sm" loading={mutation.isPending} disabled={!allMet || !passwords.currentPassword}>
              Passwort ändern
            </Button>
          </>
        }
      >
        {mutation.isError ? (
          <Alert tone="error" className="my-4">
            {mutation.error instanceof ApiError ? mutation.error.message : "Das Passwort konnte nicht geändert werden."}
          </Alert>
        ) : null}
        {message ? <Alert tone="success" className="my-4">{message}</Alert> : null}

        <SettingRow label="Aktuelles Passwort" htmlFor="settings-currentPassword">
          <Input
            id="settings-currentPassword"
            type={inputType}
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(event) => update("currentPassword", event.target.value)}
          />
        </SettingRow>

        <SettingRow label="Neues Passwort" htmlFor="settings-newPassword">
          <div className="space-y-3">
            <Input
              id="settings-newPassword"
              type={inputType}
              autoComplete="new-password"
              aria-describedby="settings-password-rules"
              value={passwords.newPassword}
              onChange={(event) => update("newPassword", event.target.value)}
            />
            <label htmlFor="settings-confirmPassword" className="sr-only">
              Neues Passwort bestätigen
            </label>
            <Input
              id="settings-confirmPassword"
              type={inputType}
              autoComplete="new-password"
              placeholder="Neues Passwort wiederholen"
              value={passwords.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
            />
            <ul id="settings-password-rules" aria-label="Passwortregeln" className="grid gap-1.5 sm:grid-cols-2">
              {rules.map((rule) => (
                <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", rule.met ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                  {rule.met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                  {rule.label}
                  <span className="sr-only">{rule.met ? "(erfüllt)" : "(nicht erfüllt)"}</span>
                </li>
              ))}
            </ul>
          </div>
        </SettingRow>
      </SettingsSection>
    </form>
  );
}
