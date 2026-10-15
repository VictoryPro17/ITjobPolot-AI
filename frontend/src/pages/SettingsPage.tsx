import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Database, FileText, Palette, Settings, ShieldCheck, UserRound } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { AppearanceSection } from "@/features/settings/AppearanceSection";
import { DataSection } from "@/features/settings/DataSection";
import { CompletenessCard, ProfileSection } from "@/features/settings/ProfileSection";
import { ResumeSection } from "@/features/settings/ResumeSection";
import { SecuritySection } from "@/features/settings/SecuritySection";
import { SettingsNav, type SettingsNavItem } from "@/features/settings/SettingsLayout";
import { useProfileForm, type CompletenessItem, type SettingsSectionKey } from "@/features/settings/useProfileForm";

const sectionKeys: SettingsSectionKey[] = ["profil", "lebenslauf", "darstellung", "sicherheit", "daten"];

function parseSection(value: string | null): SettingsSectionKey {
  return sectionKeys.find((key) => key === value) ?? "profil";
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = parseSection(searchParams.get("bereich"));
  const form = useProfileForm();
  // Feld, das nach dem Bereichswechsel fokussiert werden soll; der Zaehler loest den Sprung aus.
  const pendingFocus = useRef<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);

  const usesProfileForm = section === "profil" || section === "lebenslauf";

  const navItems: SettingsNavItem<SettingsSectionKey>[] = [
    { key: "profil", label: "Profil", icon: UserRound, attention: form.hasUnsavedChanges },
    { key: "lebenslauf", label: "Lebenslauf & Skills", icon: FileText, attention: form.hasUnsavedChanges },
    { key: "darstellung", label: "Darstellung", icon: Palette },
    { key: "sicherheit", label: "Sicherheit", icon: ShieldCheck },
    { key: "daten", label: "Daten & Datenschutz", icon: Database },
  ];

  function selectSection(next: SettingsSectionKey) {
    setSearchParams(next === "profil" ? {} : { bereich: next }, { replace: true });
  }

  function jumpTo(item: CompletenessItem) {
    selectSection(item.section);
    pendingFocus.current = item.fieldId;
    setFocusRequest((count) => count + 1);
  }

  // Nach dem Bereichswechsel zum gewuenschten Feld springen.
  useEffect(() => {
    if (!pendingFocus.current) return;
    const element = document.getElementById(pendingFocus.current);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      (element.querySelector("input, textarea") as HTMLElement | null ?? element).focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [focusRequest, section]);

  return (
    <>
      <PageHeader icon={Settings} title="Einstellungen" description="Profil, Lebenslauf, Darstellung, Sicherheit und deine Daten." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <SettingsNav items={navItems} active={section} onSelect={selectSection} />
        </aside>

        <div className="min-w-0 max-w-4xl space-y-6">
          {/* Bei vollstaendigem Profil gibt es nichts mehr zu tun; die Anzeige verschwindet. */}
          {usesProfileForm && form.percent < 100 ? <CompletenessCard percent={form.percent} items={form.completeness} onJump={jumpTo} /> : null}

          {!usesProfileForm && form.hasUnsavedChanges ? (
            <Alert tone="warning" title="Ungespeicherte Profiländerungen">
              Deine Eingaben bleiben erhalten.{" "}
              <button type="button" className="font-medium underline" onClick={() => selectSection("profil")}>
                Zurück zum Profil
              </button>{" "}
              und speichern.
            </Alert>
          ) : null}

          {section === "profil" ? <ProfileSection form={form} /> : null}
          {section === "lebenslauf" ? <ResumeSection form={form} /> : null}
          {section === "darstellung" ? <AppearanceSection /> : null}
          {section === "sicherheit" ? <SecuritySection /> : null}
          {section === "daten" ? <DataSection /> : null}
        </div>
      </div>
    </>
  );
}
