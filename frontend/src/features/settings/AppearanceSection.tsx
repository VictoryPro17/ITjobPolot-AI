import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Moon, Sun } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import type { ThemePreference } from "@/components/theme/ThemeProvider";
import { useTheme } from "@/components/theme/useTheme";
import { useAuth } from "@/features/auth/AuthProvider";
import { updateProfile, type CurrentUser } from "@/features/auth/api";
import { SettingRow, SettingsSection } from "@/features/settings/SettingsLayout";
import { cn } from "@/lib/utils";

const options: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { value: "light", label: "Hell", description: "Immer helles Design", icon: Sun },
  { value: "dark", label: "Dunkel", description: "Immer dunkles Design", icon: Moon },
  { value: "system", label: "System", description: "Folgt deinem Gerät", icon: Monitor },
];

/**
 * Sendet nur das Theme mit den *gespeicherten* Profilwerten, damit ungespeicherte
 * Eingaben aus dem Profilformular nicht versehentlich mitgespeichert werden.
 */
function themeRequest(user: CurrentUser, themePreference: ThemePreference) {
  return {
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    targetJobTitle: user.targetJobTitle ?? null,
    location: user.location ?? null,
    profileSummary: user.profileSummary ?? null,
    experienceSummary: user.experienceSummary ?? null,
    educationSummary: user.educationSummary ?? null,
    resumeText: user.resumeText ?? null,
    skills: user.skills,
    themePreference,
  };
}

export function AppearanceSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preference, setPreference } = useTheme();

  const save = useMutation({
    mutationFn: (next: ThemePreference) => updateProfile(themeRequest(user!, next)),
    onSuccess: (updated) => queryClient.setQueryData(["auth", "me"], updated),
  });

  function choose(next: ThemePreference) {
    setPreference(next);
    if (user) save.mutate(next);
  }

  return (
    <SettingsSection title="Darstellung" description="Die Auswahl gilt sofort und wird in deinem Konto gespeichert.">
      <SettingRow label="Farbschema" description="„System“ wechselt automatisch mit der Einstellung deines Geräts.">
        <div role="radiogroup" aria-label="Farbschema" className="grid gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const Icon = option.icon;
            const active = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(option.value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                  active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted",
                )}
              >
                <ThemePreview value={option.value} />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
        {save.isError ? (
          <Alert tone="warning" className="mt-3">
            Die Auswahl gilt auf diesem Gerät, konnte aber nicht im Konto gespeichert werden.
          </Alert>
        ) : null}
      </SettingRow>
    </SettingsSection>
  );
}

/** Kleine schematische Vorschau des Farbschemas. */
function ThemePreview({ value }: { value: ThemePreference }) {
  const light = <MiniWindow className="bg-white" bar="bg-slate-200" line="bg-slate-300" />;
  const dark = <MiniWindow className="bg-slate-900" bar="bg-slate-700" line="bg-slate-600" />;

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

function MiniWindow({ className, bar, line }: { className: string; bar: string; line: string }) {
  return (
    <div className={cn("flex h-full gap-1.5 p-1.5", className)}>
      <div className={cn("w-1/4 rounded-sm", bar)} />
      <div className="flex flex-1 flex-col gap-1">
        <div className={cn("h-1.5 w-3/4 rounded-sm", line)} />
        <div className={cn("h-1.5 w-1/2 rounded-sm", line)} />
        <div className={cn("mt-auto h-3 w-full rounded-sm", bar)} />
      </div>
    </div>
  );
}
