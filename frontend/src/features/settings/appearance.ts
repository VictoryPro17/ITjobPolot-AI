import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isAccentColor, isThemePreference, type AccentColor, type ThemePreference } from "@/components/theme/ThemeProvider";
import { useTheme } from "@/components/theme/useTheme";
import { useAuth } from "@/features/auth/AuthProvider";
import { updateProfile, type CurrentUser } from "@/features/auth/api";

/**
 * Sendet die Darstellung zusammen mit den *gespeicherten* Profilwerten, damit ungespeicherte
 * Eingaben aus dem Profilformular nicht versehentlich mitgespeichert werden.
 */
function appearanceRequest(user: CurrentUser, appearance: { themePreference: ThemePreference; accentColor: AccentColor }) {
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
    themePreference: appearance.themePreference,
    accentColor: appearance.accentColor,
  };
}

/**
 * Wendet eine Darstellungsaenderung sofort an und speichert sie im Konto. Jede Anfrage enthaelt
 * Modus *und* Akzent, und die Anfragen laufen nacheinander (gemeinsamer Scope). So kann eine
 * schnelle zweite Aenderung die erste nicht mit einem veralteten Wert ueberschreiben.
 */
export function useSaveAppearance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preference, accent, setPreference, setAccent } = useTheme();

  const mutation = useMutation({
    scope: { id: "appearance" },
    mutationFn: (appearance: { themePreference: ThemePreference; accentColor: AccentColor }) => updateProfile(appearanceRequest(user!, appearance)),
    onSuccess: (updated) => queryClient.setQueryData(["auth", "me"], updated),
  });

  function save(change: { themePreference?: ThemePreference; accentColor?: AccentColor }) {
    const next = { themePreference: change.themePreference ?? preference, accentColor: change.accentColor ?? accent };
    setPreference(next.themePreference);
    setAccent(next.accentColor);
    if (user) mutation.mutate(next);
  }

  return { save, isError: mutation.isError };
}

/**
 * Uebernimmt nach der Anmeldung (neuer Benutzer geladen) die im Konto gespeicherte
 * Darstellung. Danach bestimmen die Einstellungen sie; spaetere Profil-Updates
 * ueberschreiben die lokale Wahl nicht erneut.
 */
export function AppearanceSync() {
  const { user } = useAuth();
  const { setPreference, setAccent } = useTheme();
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      appliedFor.current = null;
      return;
    }
    if (appliedFor.current === user.id) return;
    appliedFor.current = user.id;

    if (isThemePreference(user.themePreference)) setPreference(user.themePreference);
    if (isAccentColor(user.accentColor)) setAccent(user.accentColor);
  }, [user, setPreference, setAccent]);

  return null;
}
