import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface SettingsNavItem<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  /** Kleiner Hinweis-Punkt, z. B. bei ungespeicherten Aenderungen. */
  attention?: boolean;
}

/** Abschnittsnavigation: links als Liste, auf schmalen Bildschirmen als waagerecht scrollbare Leiste. */
export function SettingsNav<K extends string>({
  items,
  active,
  onSelect,
}: {
  items: SettingsNavItem<K>[];
  active: K;
  onSelect: (key: K) => void;
}) {
  return (
    <nav aria-label="Einstellungsbereiche" className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;
          return (
            <li key={item.key} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
                {item.attention ? (
                  <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" title="Ungespeicherte Änderungen" aria-label="Ungespeicherte Änderungen" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Ein Einstellungsbereich: Ueberschrift, Inhalt aus Zeilen und optionale Fusszeile mit Aktionen. */
export function SettingsSection({
  title,
  description,
  children,
  footer,
  tone = "default",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-card",
        tone === "danger" ? "border-destructive/40" : "border-border",
      )}
    >
      <header className={cn("border-b px-5 py-4 sm:px-6", tone === "danger" ? "border-destructive/30 bg-destructive/5" : "border-border")}>
        <h2 id={headingId} className={cn("text-base font-semibold tracking-tight", tone === "danger" && "text-destructive")}>
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      <div className="divide-y divide-border px-5 sm:px-6">{children}</div>
      {footer ? <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-muted/40 px-5 py-3 sm:px-6">{footer}</footer> : null}
    </section>
  );
}

/** Eine Einstellung: links Bezeichnung und Erklaerung, rechts das Steuerelement (mobil untereinander). */
export function SettingRow({
  label,
  description,
  htmlFor,
  children,
  align = "start",
}: {
  label: string;
  description?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <div className={cn("grid gap-3 py-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-8", align === "center" && "md:items-center")}>
      <div>
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
        ) : (
          <p className="text-sm font-medium">{label}</p>
        )}
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Fusszeile fuer Formulare mit Speichern/Verwerfen und Statusanzeige. */
export function SaveBar({
  dirty,
  saving,
  disabled,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  disabled?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <>
      <span className={cn("mr-auto flex items-center gap-2 text-sm", dirty ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
        {dirty ? <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> : null}
        {dirty ? "Ungespeicherte Änderungen" : "Alle Änderungen gespeichert"}
      </span>
      {dirty ? (
        <button type="button" onClick={onDiscard} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Verwerfen
        </button>
      ) : null}
      <Button size="sm" loading={saving} disabled={!dirty || disabled} onClick={onSave}>
        Speichern
      </Button>
    </>
  );
}

