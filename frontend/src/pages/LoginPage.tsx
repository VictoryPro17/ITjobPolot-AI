import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/AuthProvider";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { ApiError } from "@/lib/api";

const linkClass = "font-medium text-primary-text hover:underline";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login({ email, password, rememberMe });
      const destination = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? (requestError.fieldErrors.credentials ?? requestError.message) : "Die Anmeldung ist fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Willkommen zurück"
      description="Melde dich an, um deine Bewerbungen zu verwalten."
      footer={
        <>
          Noch kein Konto? <Link className={linkClass} to="/registrieren">Jetzt registrieren</Link>
        </>
      }
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-medium">E-Mail-Adresse</label>
          <Input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="text-sm font-medium">Passwort</label>
            <Link to="/passwort-vergessen" className="text-xs font-medium text-primary-text hover:underline">Passwort vergessen?</Link>
          </div>
          <PasswordInput id="login-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
          Angemeldet bleiben
        </label>
        <Button className="w-full" type="submit" loading={isSubmitting}>Anmelden</Button>
      </form>
    </AuthLayout>
  );
}
