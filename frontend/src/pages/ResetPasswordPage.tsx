import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { PasswordRules, passwordMeetsRules } from "@/features/auth/PasswordRules";
import { resetPassword } from "@/features/auth/api";
import { ApiError } from "@/lib/api";

const linkClass = "font-medium text-primary-text hover:underline";
const buttonLinkClass = "inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mutation = useMutation({ mutationFn: resetPassword });

  const canSubmit = passwordMeetsRules(password) && password === confirm;
  const apiError = mutation.error instanceof ApiError ? mutation.error : null;
  const tokenError = apiError?.fieldErrors.token;
  const passwordError = apiError?.fieldErrors.newPassword;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) mutation.mutate({ email, token, newPassword: password });
  }

  const footer = <Link className={linkClass} to="/anmelden">Zurück zur Anmeldung</Link>;

  if (!email || !token) {
    return (
      <AuthLayout title="Neues Passwort festlegen" footer={footer}>
        <Alert tone="error">
          Dieser Link ist unvollständig. <Link className={linkClass} to="/passwort-vergessen">Neuen Link anfordern</Link>
        </Alert>
      </AuthLayout>
    );
  }

  if (mutation.isSuccess) {
    return (
      <AuthLayout title="Neues Passwort festlegen">
        <div className="space-y-4">
          <Alert tone="success">Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.</Alert>
          <Link to="/anmelden" className={buttonLinkClass}>Zur Anmeldung</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Neues Passwort festlegen" description="Wähle ein sicheres Passwort für dein Konto." footer={footer}>
      {tokenError ? (
        <Alert tone="error">
          {tokenError} <Link className={linkClass} to="/passwort-vergessen">Neuen Link anfordern</Link>
        </Alert>
      ) : mutation.isError && !passwordError ? (
        <Alert tone="error">{apiError?.message ?? "Das Passwort konnte nicht geändert werden."}</Alert>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm">
          <span className="text-muted-foreground">Konto: </span>
          <span className="font-medium">{email}</span>
        </p>
        <div className="space-y-1.5">
          <label htmlFor="reset-password" className="text-sm font-medium">Neues Passwort</label>
          <PasswordInput id="reset-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" invalid={!!passwordError} aria-describedby={passwordError ? "reset-password-error reset-password-rules" : "reset-password-rules"} />
          {passwordError ? <p id="reset-password-error" className="text-xs text-destructive">{passwordError}</p> : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reset-confirm" className="text-sm font-medium">Neues Passwort wiederholen</label>
          <PasswordInput id="reset-confirm" value={confirm} onChange={(event) => setConfirm(event.target.value)} required autoComplete="new-password" />
        </div>
        <PasswordRules id="reset-password-rules" password={password} confirm={confirm} />
        <Button className="w-full" type="submit" loading={mutation.isPending} disabled={!canSubmit}>Passwort speichern</Button>
      </form>
    </AuthLayout>
  );
}
