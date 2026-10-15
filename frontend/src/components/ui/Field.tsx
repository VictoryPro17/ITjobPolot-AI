import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Id des Eingabefelds. Gesetzt bei zusammengesetzten Feldern (z. B. TagInput mit Entfernen-Knoepfen):
   * Dann umschliesst das Label das Feld nicht, sonst wuerde ein Klick auf die Beschriftung den ersten
   * Knopf im Feld ausloesen.
   */
  htmlFor?: string;
}

export function Field({ label, hint, error, children, className, htmlFor }: FieldProps) {
  const message = error ? (
    <span className="block text-xs text-destructive">{error}</span>
  ) : hint ? (
    <span className="block text-xs text-muted-foreground">{hint}</span>
  ) : null;

  if (htmlFor) {
    return (
      <div className={cn("block space-y-1.5", className)}>
        <label htmlFor={htmlFor} className="block text-sm font-medium">
          {label}
        </label>
        {children}
        {message}
      </div>
    );
  }

  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {message}
    </label>
  );
}
