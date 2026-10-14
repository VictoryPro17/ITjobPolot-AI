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
function appearanceRequest(user: CurrentUser, change: { themePreference?: ThemePreference; accentColor?: AccentColor }) {
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
    themePreference: change.themePreference ?? null,
    accentColor: change.accentColor ?? null,
  };
}

/** Wendet eine Darstellungsaenderung sofort an und speichert sie im Konto. */
export function useSaveAppearance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setPreference, setAccent } = useTheme();

  const mutation = useMutation({
    mutationFn: (change: { themePreference?: ThemePreference; accentColor?: AccentColor }) => updateProfile(appearanceRequest(user!, change)),
    onSuccess: (updated) => queryClient.setQueryData(["auth", "me"], updated),
  });

  function save(change: { themePreference?: ThemePreference; accentColor?: AccentColor }) {
    if (change.themePreference) setPreference(change.themePreference);
    if (change.accentColor) setAccent(change.accentColor);
    if (user) mutation.mutate(change);
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
