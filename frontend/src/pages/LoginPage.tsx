import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

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
      setError(requestError instanceof ApiError ? requestError.message : "Die Anmeldung ist fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6 p-6 sm:p-8">
          <div>
            <p className="text-sm font-semibold text-primary">JobPilot AI</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Willkommen zurück</h1>
            <p className="mt-1 text-sm text-muted-foreground">Melden Sie sich an, um Ihre Bewerbungen zu verwalten.</p>
          </div>
          {error ? <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium">
              E-Mail-Adresse
              <input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </label>
            <label className="block text-sm font-medium">
              Passwort
              <input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              Angemeldet bleiben
            </label>
            <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Anmeldung läuft..." : "Anmelden"}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Noch kein Konto? <Link className="font-medium text-primary hover:underline" to="/registrieren">Jetzt registrieren</Link>
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
