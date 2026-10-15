import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function passwordRules(password: string, confirm?: string) {
  const rules = [
    { label: "Mindestens 10 Zeichen", met: password.length >= 10 },
    { label: "Ein Großbuchstabe", met: /[A-Z]/.test(password) },
    { label: "Ein Kleinbuchstabe", met: /[a-z]/.test(password) },
    { label: "Eine Ziffer", met: /[0-9]/.test(password) },
  ];
  if (confirm !== undefined) {
    rules.push({ label: "Beide Eingaben stimmen überein", met: password.length > 0 && password === confirm });
  }
  return rules;
}

/** Prüft nur die Passwortregeln (ohne Wiederholung). */
export function passwordMeetsRules(password: string) {
  return passwordRules(password).every((rule) => rule.met);
}

interface PasswordRulesProps {
  password: string;
  /** Wenn gesetzt, wird zusätzlich die Übereinstimmung geprüft. */
  confirm?: string;
  id?: string;
  className?: string;
}

export function PasswordRules({ password, confirm, id, className }: PasswordRulesProps) {
  return (
    <ul id={id} aria-label="Passwortregeln" className={cn("grid gap-1.5 sm:grid-cols-2", className)}>
      {passwordRules(password, confirm).map((rule) => (
        <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", rule.met ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
          {rule.met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
          {rule.label}
          <span className="sr-only">{rule.met ? "(erfüllt)" : "(nicht erfüllt)"}</span>
        </li>
      ))}
    </ul>
  );
}
