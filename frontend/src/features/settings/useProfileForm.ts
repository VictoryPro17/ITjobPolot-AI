import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/AuthProvider";
import { extractResumeProfile, updateProfile, uploadResume, type CurrentUser, type ResumeProfileSuggestion } from "@/features/auth/api";
import { ApiError } from "@/lib/api";

export type ProfileForm = {
  firstName: string;
  lastName: string;
  targetJobTitle: string;
  location: string;
  profileSummary: string;
  experienceSummary: string;
  educationSummary: string;
  resumeText: string;
  skills: string;
};

export type SettingsSectionKey = "profil" | "lebenslauf" | "darstellung" | "sicherheit" | "daten";

export interface CompletenessItem {
  label: string;
  done: boolean;
  section: SettingsSectionKey;
  /** id des Eingabefelds, zu dem ein Klick auf die fehlende Angabe springt. */
  fieldId: string;
}

export const PROFILE_TEXT_LIMIT = 2000;

const emptyProfile: ProfileForm = {
  firstName: "",
  lastName: "",
  targetJobTitle: "",
  location: "",
  profileSummary: "",
  experienceSummary: "",
  educationSummary: "",
  resumeText: "",
  skills: "",
};

export function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .filter((skill, index, array) => array.indexOf(skill) === index);
}

function toForm(user: CurrentUser): ProfileForm {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    targetJobTitle: user.targetJobTitle ?? "",
    location: user.location ?? "",
    profileSummary: user.profileSummary ?? "",
    experienceSummary: user.experienceSummary ?? "",
    educationSummary: user.educationSummary ?? "",
    resumeText: user.resumeText ?? "",
    skills: user.skills.join(", "),
  };
}

/** Uebernimmt Vorschlaege aus dem Lebenslauf nur in leere Felder; Skills werden ergaenzt. */
function mergeSuggestion(current: ProfileForm, suggestion: ResumeProfileSuggestion): { profile: ProfileForm; filledCount: number } {
  const next: ProfileForm = { ...current };
  let filledCount = 0;

  const fields = ["firstName", "lastName", "targetJobTitle", "location", "profileSummary", "experienceSummary", "educationSummary"] as const;
  for (const field of fields) {
    const value = suggestion[field];
    if (!current[field].trim() && value && value.trim()) {
      next[field] = value;
      filledCount += 1;
    }
  }

  next.resumeText = suggestion.resumeText;

  const existingSkills = parseSkills(current.skills);
  const seen = new Set(existingSkills.map((skill) => skill.toLowerCase()));
  const merged = [...existingSkills];
  let addedSkill = false;
  for (const skill of suggestion.skills) {
    const trimmed = skill.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      merged.push(trimmed);
      addedSkill = true;
    }
  }
  next.skills = merged.join(", ");
  if (addedSkill) filledCount += 1;

  return { profile: next, filledCount };
}

/**
 * Zustand und Aktionen des Profilformulars. Liegt bewusst in der Seite (nicht im Abschnitt),
 * damit ungespeicherte Eingaben beim Wechsel zwischen den Bereichen erhalten bleiben.
 */
export function useProfileForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Nur die gespeicherten Profildaten bestimmen den Formularstand. Ein neues Profilbild oder ein
  // geaendertes Theme aktualisiert zwar den Benutzer, darf aber ungespeicherte Eingaben nicht verwerfen.
  const savedProfileKey = user ? JSON.stringify(toForm(user)) : "";

  useEffect(() => {
    if (user) {
      setProfile(toForm(user));
      setHasUnsavedChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur bei geaenderten Profildaten
  }, [savedProfileKey]);

  // Schutz vor versehentlichem Schliessen des Tabs mit ungespeicherten Aenderungen.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        firstName: profile.firstName.trim() || null,
        lastName: profile.lastName.trim() || null,
        targetJobTitle: profile.targetJobTitle.trim() || null,
        location: profile.location.trim() || null,
        profileSummary: profile.profileSummary.trim() || null,
        experienceSummary: profile.experienceSummary.trim() || null,
        educationSummary: profile.educationSummary.trim() || null,
        resumeText: profile.resumeText.trim() || null,
        skills: parseSkills(profile.skills),
        // null laesst das gespeicherte Theme unveraendert; es wird separat gespeichert.
        themePreference: null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      setMessage("Profil wurde gespeichert.");
      setHasUnsavedChanges(false);
    },
    onError: (saveError) => setError(saveError instanceof ApiError ? saveError.message : "Profil konnte nicht gespeichert werden."),
  });

  function save() {
    setMessage("");
    setError("");
    saveMutation.mutate();
  }

  function setField(key: keyof ProfileForm, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
    setHasUnsavedChanges(true);
  }

  function discard() {
    if (user) setProfile(toForm(user));
    setHasUnsavedChanges(false);
    setMessage("");
    setError("");
  }

  function applySuggestion(suggestion: ResumeProfileSuggestion) {
    const { profile: merged, filledCount } = mergeSuggestion(profile, suggestion);
    setProfile(merged);
    setHasUnsavedChanges(true);
    setMessage(
      `Lebenslauf ausgelesen – ${filledCount} Felder vorausgefüllt. Bereits ausgefüllte Felder wurden nicht überschrieben. Bitte prüfen und mit „Speichern“ übernehmen.`,
    );
  }

  async function uploadResumeFile(file: File) {
    setError("");
    setMessage("");
    setIsUploading(true);
    setResumeFileName(file.name);
    try {
      applySuggestion(await uploadResume(file));
    } catch (uploadError) {
      setError(uploadError instanceof ApiError ? uploadError.message : "Der Lebenslauf konnte nicht verarbeitet werden.");
    } finally {
      setIsUploading(false);
    }
  }

  async function extractFromText() {
    if (!profile.resumeText.trim()) {
      setError("Bitte erst einen Lebenslauf-Text eingeben.");
      return;
    }
    setError("");
    setMessage("");
    setIsExtracting(true);
    try {
      applySuggestion(await extractResumeProfile(profile.resumeText));
    } catch (extractError) {
      setError(extractError instanceof ApiError ? extractError.message : "Der Lebenslauf-Text konnte nicht ausgewertet werden.");
    } finally {
      setIsExtracting(false);
    }
  }

  const completeness: CompletenessItem[] = [
    { label: "Vorname", done: Boolean(profile.firstName.trim()), section: "profil", fieldId: "settings-firstName" },
    { label: "Nachname", done: Boolean(profile.lastName.trim()), section: "profil", fieldId: "settings-lastName" },
    { label: "Wunschposition", done: Boolean(profile.targetJobTitle.trim()), section: "profil", fieldId: "settings-targetJobTitle" },
    { label: "Standort", done: Boolean(profile.location.trim()), section: "profil", fieldId: "settings-location" },
    { label: "Lebenslauf-Text", done: Boolean(profile.resumeText.trim()), section: "lebenslauf", fieldId: "settings-resumeText" },
    { label: "Profilzusammenfassung", done: Boolean(profile.profileSummary.trim()), section: "lebenslauf", fieldId: "settings-profileSummary" },
    { label: "Berufserfahrung", done: Boolean(profile.experienceSummary.trim()), section: "lebenslauf", fieldId: "settings-experienceSummary" },
    { label: "Ausbildung", done: Boolean(profile.educationSummary.trim()), section: "lebenslauf", fieldId: "settings-educationSummary" },
    { label: "Skills", done: parseSkills(profile.skills).length > 0, section: "lebenslauf", fieldId: "settings-skills" },
  ];
  const percent = Math.round((completeness.filter((item) => item.done).length / completeness.length) * 100);

  const tooLong = (["profileSummary", "experienceSummary", "educationSummary"] as const).some((key) => profile[key].length > PROFILE_TEXT_LIMIT);

  return {
    user,
    profile,
    setProfile: (updater: (current: ProfileForm) => ProfileForm) => {
      setProfile(updater);
      setHasUnsavedChanges(true);
    },
    setField,
    save,
    discard,
    isSaving: saveMutation.isPending,
    canSave: !tooLong,
    hasUnsavedChanges,
    message,
    error,
    resumeFileName,
    isUploading,
    isExtracting,
    uploadResumeFile,
    extractFromText,
    completeness,
    percent,
  };
}

export type ProfileFormState = ReturnType<typeof useProfileForm>;
