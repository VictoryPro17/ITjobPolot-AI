import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { resendConfirmation } from "@/features/auth/api";
import { ApiError } from "@/lib/api";

const COOLDOWN_MS = 30_000;

/** Schmaler Hinweis, solange die E-Mail-Adresse nicht bestätigt ist. */
export function EmailConfirmationBanner({ email }: { email: string }) {
  const [coolingDown, setCoolingDown] = useState(false);
  const mutation = useMutation({
    mutationFn: resendConfirmation,
    onSuccess: () => setCoolingDown(true),
  });

  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setTimeout(() => setCoolingDown(false), COOLDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [coolingDown]);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 sm:px-6 lg:px-10 dark:text-amber-200"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        Bitte bestätige deine E-Mail-Adresse – wir haben dir einen Link an {email} geschickt.
        {mutation.isSuccess ? <span className="ml-1 font-medium">Neue E-Mail verschickt.</span> : null}
        {mutation.isError ? (
          <span className="ml-1 font-medium text-destructive">
            {mutation.error instanceof ApiError ? mutation.error.message : "Die E-Mail konnte nicht verschickt werden."}
          </span>
        ) : null}
      </p>
      <Button variant="outline" size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={coolingDown}>
        Erneut senden
      </Button>
    </div>
  );
}
