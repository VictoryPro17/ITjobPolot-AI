import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Paperclip, Trash2, Unlink } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  deleteDocument,
  documentTypeLabels,
  downloadDocument,
  getDocuments,
  updateDocument,
  uploadDocument,
  type DocumentItem,
  type DocumentType,
} from "@/features/documents/api";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";

const documentTypes = Object.keys(documentTypeLabels) as DocumentType[];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function DocumentsTab({ applicationId }: { applicationId: string }) {
  const queryClient = useQueryClient();

  const [uploadType, setUploadType] = useState<DocumentType>("Other");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);

  const documents = useQuery({
    queryKey: ["documents", "application", applicationId],
    queryFn: () => getDocuments(applicationId),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file, uploadType, applicationId),
    onSuccess: refresh,
    onError: (err) => setError(errorMessage(err, "Das Dokument konnte nicht hochgeladen werden.")),
  });

  const unlinkMutation = useMutation({
    mutationFn: (item: DocumentItem) => updateDocument(item.id, { documentType: item.documentType, jobApplicationId: null }),
    onSuccess: refresh,
    onError: (err) => setError(errorMessage(err, "Die Zuordnung konnte nicht gelöst werden.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: DocumentItem) => deleteDocument(item.id),
    onSuccess: () => {
      setDeleting(null);
      refresh();
    },
    onError: (err) => {
      setDeleting(null);
      setError(errorMessage(err, "Das Dokument konnte nicht gelöscht werden."));
    },
  });

  async function handleDownload(item: DocumentItem) {
    setError("");
    try {
      await downloadDocument(item.id);
    } catch (err) {
      setError(errorMessage(err, "Das Dokument konnte nicht heruntergeladen werden."));
    }
  }

  function handleFile(file: File) {
    setError("");
    uploadMutation.mutate(file);
  }

  const items = documents.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={Paperclip} title="Dokumente" description="Unterlagen, die zu dieser Bewerbung gehören." />
        <CardBody className="space-y-4">
          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <Field label="Dokumenttyp">
              <Select value={uploadType} onChange={(event) => setUploadType(event.target.value as DocumentType)}>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {documentTypeLabels[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <FileDropzone
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
              hint="PDF, DOCX, TXT, MD, PNG oder JPG, max. 10 MB"
              loading={uploadMutation.isPending}
              onFile={handleFile}
            />
          </div>

          {documents.isError ? <Alert tone="error">Die Dokumente konnten nicht geladen werden.</Alert> : null}

          {documents.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : items.length === 0 && !documents.isError ? (
            <EmptyState
              icon={Paperclip}
              title="Noch keine Dokumente"
              description="Lade z. B. dein Anschreiben oder die Stellenanzeige als PDF hoch."
            />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.fileName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge tone="primary">{documentTypeLabels[item.documentType]}</Badge>
                      <span>{formatBytes(item.sizeInBytes)}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label="Herunterladen" onClick={() => void handleDownload(item)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Zuordnung lösen"
                      title="Zuordnung lösen"
                      disabled={unlinkMutation.isPending}
                      onClick={() => {
                        setError("");
                        unlinkMutation.mutate(item);
                      }}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Löschen"
                      className="text-destructive"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        tone="destructive"
        title="Dokument löschen?"
        description={`„${deleting?.fileName ?? ""}“ wird dauerhaft gelöscht.`}
        confirmLabel="Löschen"
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
