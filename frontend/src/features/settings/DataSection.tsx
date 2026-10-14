import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SettingRow, SettingsSection } from "@/features/settings/SettingsLayout";
import { ApiError, apiDownload, apiFetch, saveBlob } from "@/lib/api";

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
      <SettingsSection title="Daten & Datenschutz" description="Deine Rechte nach DSGVO: Auskunft und Datenübertragbarkeit.">
        <SettingRow
          label="Datenexport"
          description="Profil, Bewerbungen mit Notizen und Statusverlauf, Erinnerungen, Dokument-Informationen, KI-Analysen und Anschreiben als JSON-Datei. Die hochgeladenen Dateien selbst sind nicht enthalten."
          align="center"
        >
          <div className="flex md:justify-end">
            <Button variant="outline" loading={isExporting} onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              Daten exportieren
            </Button>
          </div>
          {exportError ? <Alert tone="error" className="mt-3">{exportError}</Alert> : null}
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Gefahrenbereich" description="Diese Aktion kann nicht rückgängig gemacht werden." tone="danger">
        <SettingRow
          label="Konto löschen"
          description="Löscht dein Konto mit allen Bewerbungen, Notizen, Dokumenten, Erinnerungen und KI-Ergebnissen endgültig."
          align="center"
        >
          <div className="flex md:justify-end">
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Konto löschen
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
