import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setIsSubmitting(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Die Registrierung ist fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6 p-6 sm:p-8">
          <div><p className="text-sm font-semibold text-primary">JobPilot AI</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Konto erstellen</h1><p className="mt-1 text-sm text-muted-foreground">Starten Sie mit einem übersichtlichen Bewerbungsmanager.</p></div>
          {error ? <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Vorname<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} autoComplete="given-name" /></label>
              <label className="block text-sm font-medium">Nachname<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} autoComplete="family-name" /></label>
            </div>
            <label className="block text-sm font-medium">E-Mail-Adresse<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required autoComplete="email" /></label>
            <label className="block text-sm font-medium">Passwort<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required minLength={10} autoComplete="new-password" /></label>
            <label className="block text-sm font-medium">Passwort wiederholen<input className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required autoComplete="new-password" /></label>
            <p className="text-xs text-muted-foreground">Mindestens 10 Zeichen mit Großbuchstaben, Kleinbuchstaben und Ziffer.</p>
            <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Konto wird erstellt..." : "Registrieren"}</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">Bereits registriert? <Link className="font-medium text-primary hover:underline" to="/anmelden">Anmelden</Link></p>
        </CardBody>
      </Card>
    </main>
  );
}
