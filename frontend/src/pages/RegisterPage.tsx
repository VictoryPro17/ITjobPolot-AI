import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/AuthProvider";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { PasswordRules, passwordMeetsRules } from "@/features/auth/PasswordRules";
import { ApiError } from "@/lib/api";

const labelClass = "text-sm font-medium";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="text-xs text-destructive">{message}</p> : null;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = passwordMeetsRules(form.password) && form.password === form.confirmPassword;

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      // Neue Konten richten zuerst ihr Profil ein (Pflicht-Einstieg).
      navigate("/willkommen", { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.status === 400 && Object.keys(requestError.fieldErrors).length > 0) {
          setFieldErrors(requestError.fieldErrors);
        } else {
          setError(requestError.message);
        }
      } else {
        setError("Die Registrierung ist fehlgeschlagen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Konto erstellen"
      description="Starte mit deinem persönlichen Bewerbungsmanager."
      footer={
        <>
          Bereits registriert? <Link className="font-medium text-primary-text hover:underline" to="/anmelden">Anmelden</Link>
        </>
      }
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="register-firstName" className={labelClass}>Vorname</label>
            <Input id="register-firstName" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} autoComplete="given-name" invalid={!!fieldErrors.firstName} aria-describedby={fieldErrors.firstName ? "register-firstName-error" : undefined} />
            <FieldError id="register-firstName-error" message={fieldErrors.firstName} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-lastName" className={labelClass}>Nachname</label>
            <Input id="register-lastName" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} autoComplete="family-name" invalid={!!fieldErrors.lastName} aria-describedby={fieldErrors.lastName ? "register-lastName-error" : undefined} />
            <FieldError id="register-lastName-error" message={fieldErrors.lastName} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="register-email" className={labelClass}>E-Mail-Adresse</label>
          <Input id="register-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required autoComplete="email" invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "register-email-error" : undefined} />
          <FieldError id="register-email-error" message={fieldErrors.email} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="register-password" className={labelClass}>Passwort</label>
          <PasswordInput id="register-password" value={form.password} onChange={(event) => update("password", event.target.value)} required autoComplete="new-password" invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "register-password-error register-password-rules" : "register-password-rules"} />
          <FieldError id="register-password-error" message={fieldErrors.password} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="register-confirmPassword" className={labelClass}>Passwort wiederholen</label>
          <PasswordInput id="register-confirmPassword" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required autoComplete="new-password" />
        </div>
        <PasswordRules id="register-password-rules" password={form.password} confirm={form.confirmPassword} />
        <Button className="w-full" type="submit" loading={isSubmitting} disabled={!canSubmit}>Registrieren</Button>
      </form>
    </AuthLayout>
  );
}
