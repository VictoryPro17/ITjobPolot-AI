import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { forgotPassword } from "@/features/auth/api";
import { ApiError } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: forgotPassword });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(email);
  }

  return (
    <AuthLayout
      title="Passwort vergessen?"
      description="Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen."
      footer={<Link className="font-medium text-primary-text hover:underline" to="/anmelden">Zurück zur Anmeldung</Link>}
    >
      {mutation.isSuccess ? (
        <Alert tone="success">
          Falls ein Konto zu dieser Adresse existiert, haben wir dir eine E-Mail mit einem Link geschickt. Der Link ist 2 Stunden gültig.
        </Alert>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mutation.isError ? (
            <Alert tone="error">{mutation.error instanceof ApiError ? mutation.error.message : "Die Anfrage ist fehlgeschlagen."}</Alert>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="text-sm font-medium">E-Mail-Adresse</label>
            <Input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </div>
          <Button className="w-full" type="submit" loading={mutation.isPending}>Link senden</Button>
        </form>
      )}
    </AuthLayout>
  );
}
