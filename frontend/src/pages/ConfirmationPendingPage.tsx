import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, MailCheck, RefreshCw, Send } from "lucide-react";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthProvider";
import { getCurrentUser, resendConfirmation } from "@/features/auth/api";
import { ApiError } from "@/lib/api";

const RESEND_COOLDOWN_MS = 30_000;

/**
 * Wartseite fuer neue Konten: Ohne bestaetigte E-Mail-Adresse ist die App gesperrt. Von hier aus
 * laesst sich die Mail erneut anfordern oder pruefen, ob die Bestaetigung inzwischen erfolgt ist
 * (z. B. wenn der Link auf einem anderen Geraet geoeffnet wurde).
 */
export function ConfirmationPendingPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [coolingDown, setCoolingDown] = useState(false);
  const [stillUnconfirmed, setStillUnconfirmed] = useState(false);

  const resend = useMutation({
    mutationFn: resendConfirmation,
    onSuccess: () => setCoolingDown(true),
  });

  // Erneut pruefen: /me erneuert das Anmelde-Cookie, sobald die Adresse bestaetigt ist.
  const check = useMutation({
    mutationFn: getCurrentUser,
    onSuccess: (current) => {
      queryClient.setQueryData(["auth", "me"], current);
      setStillUnconfirmed(current?.emailConfirmed === false);
    },
  });

  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setTimeout(() => setCoolingDown(false), RESEND_COOLDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [coolingDown]);

  return (
    <AuthLayout
      title="Bitte bestätige deine E-Mail-Adresse"
      description="Bevor du JobPilot nutzen kannst, bestätige bitte, dass diese Adresse dir gehört."
      footer={
        <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1.5 hover:text-foreground">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Abmelden
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
            <MailCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed">
            Wir haben eine E-Mail an <span className="font-medium">{user?.email}</span> geschickt. Öffne den Link darin, um dein
            Konto freizuschalten. Der Link ist 3 Tage gültig.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Keine E-Mail erhalten? Sieh auch im Spam-Ordner nach oder fordere eine neue an.
        </p>

        {resend.isSuccess ? <Alert tone="success">Neue E-Mail verschickt.</Alert> : null}
        {resend.isError ? (
          <Alert tone="error">{resend.error instanceof ApiError ? resend.error.message : "Die E-Mail konnte nicht verschickt werden."}</Alert>
        ) : null}
        {stillUnconfirmed ? <Alert tone="warning">Deine E-Mail-Adresse ist noch nicht bestätigt. Öffne zuerst den Link aus der E-Mail.</Alert> : null}
        {check.isError ? <Alert tone="error">Der Status konnte nicht geprüft werden. Bitte versuche es erneut.</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={() => check.mutate()} loading={check.isPending}>
            <RefreshCw className="h-4 w-4" />
            Ich habe bestätigt
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => resend.mutate()} loading={resend.isPending} disabled={coolingDown}>
            <Send className="h-4 w-4" />
            Erneut senden
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
