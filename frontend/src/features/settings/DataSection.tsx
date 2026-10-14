import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download, FileJson, Minus, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SettingRow, SettingsSection } from "@/features/settings/SettingsLayout";
import { ApiError, apiDownload, apiFetch, saveBlob } from "@/lib/api";

const includedInExport = [
  "Profil und Lebenslauf-Text, Skills und Darstellung",
  "Bewerbungen mit Notizen und Statusverlauf",
  "Erinnerungen",
  "Angaben zu deinen Dokumenten (Name, Typ, Größe, Prüfsumme)",
  "KI-Analysen und erstellte Anschreiben",
];

const notIncludedInExport = ["Die hochgeladenen Dateien selbst", "Passwort und Sicherheitsdaten deines Kontos"];

const deletedWithAccount = [
  "dein Profil, Profilbild und Lebenslauf",
  "alle Bewerbungen mit Notizen und Statusverlauf",
  "alle Dokumente und Dateien",
  "alle Erinnerungen, KI-Analysen und Anschreiben",
];

export function DataSection() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const deleteAccount = useMutation({
    mutationFn: () => apiFetch<void>("/auth/account", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) }),
    onSuccess: () => {
      queryClient.clear();
      navigate("/anmelden", { replace: true });
    },
  });

  async function handleExport() {
    setExportError("");
    setIsExporting(true);
    try {
      const { blob, fileName } = await apiDownload("/auth/export");
      saveBlob(blob, fileName);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.message : "Der Datenexport ist fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  }

  function closeDeleteDialog() {
    setDeleteOpen(false);
    setDeletePassword("");
    deleteAccount.reset();
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Deine Daten herunterladen"
        description="Du kannst jederzeit eine Kopie aller Daten anfordern, die JobPilot zu deinem Konto speichert (Auskunft und Datenübertragbarkeit nach Art. 15 und 20 DSGVO)."
      >
        <SettingRow label="Enthalten" description="Der Export wird sofort erstellt und direkt heruntergeladen.">
          <ul className="space-y-2 text-sm">
            {includedInExport.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </SettingRow>

        <SettingRow label="Nicht enthalten">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {notIncludedInExport.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Hochgeladene Dateien lädst du einzeln unter{" "}
            <Link to="/dokumente" className="font-medium text-primary-text underline-offset-2 hover:underline">
              Dokumente
            </Link>{" "}
            herunter.
          </p>
        </SettingRow>

        <SettingRow label="Format" align="center">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <FileJson className="h-4 w-4" aria-hidden="true" />
              JSON – maschinenlesbar, mit jedem Texteditor zu öffnen
            </span>
            <Button variant="outline" loading={isExporting} onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              Export herunterladen
            </Button>
          </div>
          {exportError ? <Alert tone="error" className="mt-3">{exportError}</Alert> : null}
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Konto löschen" description="Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden." tone="danger">
        <SettingRow label="Was gelöscht wird" description="Lade vorher deine Daten herunter, wenn du sie behalten möchtest.">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {deletedWithAccount.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-4">
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Konto endgültig löschen
            </Button>
          </div>
        </SettingRow>
      </SettingsSection>

      <ConfirmDialog
        open={deleteOpen}
        tone="destructive"
        title="Konto endgültig löschen?"
        description="Alle Daten werden sofort und unwiderruflich gelöscht. Bitte bestätige mit deinem Passwort."
        confirmLabel="Endgültig löschen"
        loading={deleteAccount.isPending}
        disabled={!deletePassword}
        onConfirm={() => deleteAccount.mutate()}
        onCancel={closeDeleteDialog}
      >
        <div className="space-y-4">
          {deleteAccount.isError ? (
            <Alert tone="error">{deleteAccount.error instanceof ApiError ? deleteAccount.error.message : "Das Konto konnte nicht gelöscht werden."}</Alert>
          ) : null}
          <Field label="Aktuelles Passwort">
            <Input type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}
