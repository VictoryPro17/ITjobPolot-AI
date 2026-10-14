import { Sparkles } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { TagInput } from "@/components/ui/TagInput";
import { Textarea } from "@/components/ui/Textarea";
import { SaveBar, SettingRow, SettingsSection } from "@/features/settings/SettingsLayout";
import { parseSkills, PROFILE_TEXT_LIMIT, type ProfileForm, type ProfileFormState } from "@/features/settings/useProfileForm";
import { cn } from "@/lib/utils";

const textFields: { key: keyof ProfileForm; label: string; description: string; placeholder: string }[] = [
  {
    key: "profileSummary",
    label: "Profilzusammenfassung",
    description: "Zwei, drei Sätze über dich – Grundlage für den Einstieg im Anschreiben.",
    placeholder: "z. B. Backend-Entwickler mit Fokus auf .NET und Cloud …",
  },
  {
    key: "experienceSummary",
    label: "Berufserfahrung",
    description: "Stationen, Projekte und Verantwortung. Fließt in den Erfahrungs-Teil des Matches ein.",
    placeholder: "z. B. 2023–heute: Werkstudent bei …",
  },
  {
    key: "educationSummary",
    label: "Ausbildung / Lernpfad",
    description: "Abschlüsse, Weiterbildungen, Zertifikate.",
    placeholder: "z. B. B.Sc. Informatik, AZ-900 …",
  },
];

export function ResumeSection({ form }: { form: ProfileFormState }) {
  const { profile, setField } = form;

  return (
    <SettingsSection
      title="Lebenslauf & Skills"
      description="Lade deinen Lebenslauf hoch – leere Felder werden vorausgefüllt. Gespeichert wird erst nach deiner Bestätigung."
      footer={<SaveBar dirty={form.hasUnsavedChanges} saving={form.isSaving} disabled={!form.canSave} onSave={form.save} onDiscard={form.discard} />}
    >
      {form.error ? <Alert tone="error" className="my-4">{form.error}</Alert> : null}
      {form.message ? <Alert tone="success" className="my-4">{form.message}</Alert> : null}

      <SettingRow label="Lebenslauf hochladen" description="PDF, DOCX, TXT oder MD, max. 10 MB. Bereits ausgefüllte Felder werden nicht überschrieben.">
        <FileDropzone
          accept=".pdf,.docx,.txt,.md"
          hint="PDF, DOCX, TXT oder MD, max. 10 MB"
          loading={form.isUploading}
          fileName={form.resumeFileName}
          disabled={form.isExtracting}
          onFile={(file) => void form.uploadResumeFile(file)}
        />
      </SettingRow>

      <SettingRow label="Lebenslauf-Text" htmlFor="settings-resumeText" description="Ausgelesener oder eingefügter Text. Aus ihm kann JobPilot die übrigen Felder ableiten.">
        <Textarea
          id="settings-resumeText"
          className="min-h-40"
          value={profile.resumeText}
          onChange={(event) => setField("resumeText", event.target.value)}
          placeholder="Lebenslauf-Text hier einfügen …"
        />
        <div className="mt-2 flex justify-end">
          <Button variant="outline" size="sm" loading={form.isExtracting} disabled={form.isUploading || !profile.resumeText.trim()} onClick={() => void form.extractFromText()}>
            <Sparkles className="h-4 w-4" />
            Felder aus Text ableiten
          </Button>
        </div>
      </SettingRow>

      {textFields.map((field) => {
        const value = profile[field.key];
        const tooLong = value.length > PROFILE_TEXT_LIMIT;
        const id = `settings-${field.key}`;
        return (
          <SettingRow key={field.key} label={field.label} htmlFor={id} description={field.description}>
            <Textarea
              id={id}
              className="min-h-28"
              invalid={tooLong}
              value={value}
              placeholder={field.placeholder}
              aria-describedby={`${id}-count`}
              onChange={(event) => setField(field.key, event.target.value)}
            />
            <p id={`${id}-count`} className={cn("mt-1 text-right text-xs tabular-nums", tooLong ? "text-destructive" : "text-muted-foreground")}>
              {tooLong ? `Maximal ${PROFILE_TEXT_LIMIT.toLocaleString("de-DE")} Zeichen · ` : null}
              {value.length.toLocaleString("de-DE")} / {PROFILE_TEXT_LIMIT.toLocaleString("de-DE")}
            </p>
          </SettingRow>
        );
      })}

      <SettingRow label="Skills" description="Mit Enter oder Komma hinzufügen. Grundlage für den Skill-Abgleich (70 % des Match-Scores).">
        <div id="settings-skills" tabIndex={-1} className="outline-none">
          <TagInput
            value={parseSkills(profile.skills)}
            onChange={(tags) => form.setProfile((current) => ({ ...current, skills: tags.join(", ") }))}
            placeholder="z. B. C#, React, Azure"
          />
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
