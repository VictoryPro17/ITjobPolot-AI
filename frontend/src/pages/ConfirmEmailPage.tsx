import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { confirmEmail } from "@/features/auth/api";
import { ApiError } from "@/lib/api";

const buttonLinkClass = "inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90";

export function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const userId = params.get("userId") ?? "";
  const token = params.get("token") ?? "";
  const queryClient = useQueryClient();
  const started = useRef(false);
  const { mutate, isSuccess, isError, error } = useMutation({
    mutationFn: confirmEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });

  useEffect(() => {
    // Nur einmal bestätigen, auch wenn React im Entwicklungsmodus Effekte doppelt ausführt.
    if (started.current || !userId || !token) return;
    started.current = true;
    mutate({ userId, token });
  }, [userId, token, mutate]);

  if (isSuccess) {
    return (
      <AuthLayout title="E-Mail-Adresse bestätigt">
        <div className="space-y-4">
          <Alert tone="success">Danke! Deine E-Mail-Adresse ist jetzt bestätigt.</Alert>
          <Link to="/" className={buttonLinkClass}>Weiter zu JobPilot</Link>
        </div>
      </AuthLayout>
    );
  }

  if (!userId || !token || isError) {
    const message = !userId || !token
      ? "Dieser Link ist unvollständig."
      : error instanceof ApiError
        ? error.message
        : "Die E-Mail-Adresse konnte nicht bestätigt werden.";
    return (
      <AuthLayout title="Bestätigung fehlgeschlagen">
        <div className="space-y-4">
          <Alert tone="error">{message}</Alert>
          <p className="text-sm text-muted-foreground">
            Du kannst in JobPilot einen neuen Bestätigungslink anfordern. Melde dich dafür an und klicke im Hinweis oben auf „Erneut senden“.
          </p>
          <Link to="/" className={buttonLinkClass}>Weiter zu JobPilot</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="E-Mail-Adresse bestätigen">
      <Spinner label="E-Mail-Adresse wird bestätigt …" />
    </AuthLayout>
  );
}
