import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import type { AccentColor, ThemePreference } from "@/components/theme/ThemeProvider";
import { useTheme } from "@/components/theme/useTheme";
import { useSaveAppearance } from "@/features/settings/appearance";
import { SettingRow, SettingsSection } from "@/features/settings/SettingsLayout";
import { cn } from "@/lib/utils";

const modes: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { value: "light", label: "Hell", description: "Immer helles Design", icon: Sun },
  { value: "dark", label: "Dunkel", description: "Immer dunkles Design", icon: Moon },
  { value: "system", label: "System", description: "Folgt deinem Gerät", icon: Monitor },
];

/** Vorschaufarben der Akzente (entsprechen --primary im hellen Modus). */
const accents: { value: AccentColor; label: string; swatch: string }[] = [
  { value: "blue", label: "Blau", swatch: "oklch(0.55 0.21 264)" },
  { value: "green", label: "Grün", swatch: "oklch(0.52 0.14 155)" },
  { value: "purple", label: "Lila", swatch: "oklch(0.53 0.22 300)" },
];

export function AppearanceSection() {
  const { preference, accent } = useTheme();
  const { save, isError } = useSaveAppearance();

  return (
    <SettingsSection title="Darstellung" description="Änderungen gelten sofort und werden in deinem Konto gespeichert – auch für andere Geräte.">
      <SettingRow label="Modus" description="„System“ wechselt automatisch mit der Einstellung deines Geräts.">
        <div role="radiogroup" aria-label="Modus" className="grid gap-3 sm:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const active = preference === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => save({ themePreference: mode.value })}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                  active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted",
                )}
              >
                <ModePreview value={mode.value} />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {mode.label}
                </span>
                <span className="text-xs text-muted-foreground">{mode.description}</span>
              </button>
            );
          })}
        </div>
      </SettingRow>

      <SettingRow label="Akzentfarbe" description="Färbt Schaltflächen, Hervorhebungen und das Logo. Statusfarben bleiben unverändert.">
        <div role="radiogroup" aria-label="Akzentfarbe" className="flex flex-wrap gap-3">
          {accents.map((option) => {
            const active = accent === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => save({ accentColor: option.value })}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border py-2 pl-2 pr-4 text-sm font-medium transition-colors",
                  active ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted",
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: option.swatch }} aria-hidden="true">
                  {active ? <Check className="h-4 w-4" /> : null}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
        {isError ? (
          <Alert tone="warning" className="mt-3">
            Die Auswahl gilt auf diesem Gerät, konnte aber nicht im Konto gespeichert werden.
          </Alert>
        ) : null}
      </SettingRow>
    </SettingsSection>
  );
}

/** Kleine schematische Vorschau des Modus in der aktuellen Akzentfarbe. */
function ModePreview({ value }: { value: ThemePreference }) {
  const light = <MiniWindow surface="bg-white" bar="bg-slate-200" line="bg-slate-300" />;
  const dark = <MiniWindow surface="bg-slate-900" bar="bg-slate-700" line="bg-slate-600" />;

  return (
    <div className="h-16 w-full overflow-hidden rounded-md border border-border" aria-hidden="true">
      {value === "light" ? light : value === "dark" ? dark : (
        <div className="grid h-full grid-cols-2">
          {light}
          {dark}
        </div>
      )}
    </div>
  );
}

function MiniWindow({ surface, bar, line }: { surface: string; bar: string; line: string }) {
  return (
    <div className={cn("flex h-full gap-1.5 p-1.5", surface)}>
      <div className={cn("w-1/4 rounded-sm", bar)} />
      <div className="flex flex-1 flex-col gap-1">
        <div className={cn("h-1.5 w-3/4 rounded-sm", line)} />
        <div className={cn("h-1.5 w-1/2 rounded-sm", line)} />
        <div className="mt-auto h-3 w-1/3 rounded-sm bg-primary" />
      </div>
    </div>
  );
}
