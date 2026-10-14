import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BadgeCheck,
  Download,
  File,
  FileImage,
  FileText,
  FileUser,
  FolderOpen,
  Mail,
  Pencil,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { getApplications } from "@/features/applications/api";
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

const documentTypes = Object.keys(documentTypeLabels) as DocumentType[];

const typeIcons: Record<DocumentType, LucideIcon> = {
  Resume: FileUser,
  CoverLetter: Mail,
  Reference: Award,
  Certificate: BadgeCheck,
  Other: File,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function DocumentsPage() {
  const queryClient = useQueryClient();

  const [uploadType, setUploadType] = useState<DocumentType>("Other");
  const [uploadApplicationId, setUploadApplicationId] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [filter, setFilter] = useState<DocumentType | "All">("All");
  const [actionError, setActionError] = useState("");

  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [editType, setEditType] = useState<DocumentType>("Other");
  const [editApplicationId, setEditApplicationId] = useState("");
  const [editError, setEditError] = useState("");
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);

  const documents = useQuery({ queryKey: ["documents"], queryFn: getDocuments });
  const applications = useQuery({
    queryKey: ["applications", "options"],
    queryFn: () => getApplications({ search: "", status: "", page: 1, pageSize: 100 }),
  });
  const applicationOptions = applications.data?.items ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file, uploadType, uploadApplicationId || null),
    onSuccess: (uploaded) => {
      setUploadSuccess(`${uploaded.fileName} wurde hochgeladen.`);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => setUploadError(errorMessage(error, "Das Dokument konnte nicht hochgeladen werden.")),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateDocument(editing!.id, { documentType: editType, jobApplicationId: editApplicationId || null }),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => setEditError(errorMessage(error, "Das Dokument konnte nicht gespeichert werden.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(deleting!.id),
    onSuccess: () => {
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      setDeleting(null);
      setActionError(errorMessage(error, "Das Dokument konnte nicht gelöscht werden."));
    },
  });

  function handleFile(file: File) {
    setUploadSuccess("");
    setUploadError("");
    uploadMutation.mutate(file);
  }

  async function handleDownload(item: DocumentItem) {
    setActionError("");
    try {
      await downloadDocument(item.id);
    } catch (error) {
      setActionError(errorMessage(error, "Das Dokument konnte nicht heruntergeladen werden."));
    }
  }

  function openEdit(item: DocumentItem) {
    setEditing(item);
    setEditType(item.documentType);
    setEditApplicationId(item.jobApplicationId ?? "");
    setEditError("");
  }

  const items = documents.data ?? [];
  const visible = filter === "All" ? items : items.filter((item) => item.documentType === filter);

  const tabs = [
    { value: "All" as const, label: "Alle", count: items.length },
    ...documentTypes.map((type) => ({
      value: type,
      label: documentTypeLabels[type],
      count: items.filter((item) => item.documentType === type).length,
    })),
  ];

  const applicationSelectOptions = (
    <>
      <option value="">Keine Zuordnung</option>
      {applicationOptions.map((application) => (
        <option key={application.id} value={application.id}>
          {application.companyName} · {application.jobTitle}
        </option>
      ))}
    </>
  );

  const typeSelectOptions = documentTypes.map((type) => (
    <option key={type} value={type}>
      {documentTypeLabels[type]}
    </option>
  ));

  return (
    <>
      <PageHeader icon={FileText} title="Dokumente" description="Lebensläufe, Anschreiben und Zeugnisse sicher verwalten." />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader icon={Upload} title="Hochladen" />
          <CardBody className="space-y-4">
            {uploadSuccess ? <Alert tone="success">{uploadSuccess}</Alert> : null}
            {uploadError ? <Alert tone="error">{uploadError}</Alert> : null}

            <Field label="Dokumenttyp">
              <Select value={uploadType} onChange={(event) => setUploadType(event.target.value as DocumentType)}>
                {typeSelectOptions}
              </Select>
            </Field>
            <Field label="Bewerbung (optional)">
              <Select value={uploadApplicationId} onChange={(event) => setUploadApplicationId(event.target.value)}>
                {applicationSelectOptions}
              </Select>
            </Field>
            <FileDropzone
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
              hint="PDF, DOCX, TXT, MD, PNG oder JPG, max. 10 MB"
              loading={uploadMutation.isPending}
              onFile={handleFile}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={FolderOpen} title="Meine Dokumente" />
          <CardBody className="space-y-4">
            <SegmentedTabs value={filter} onChange={setFilter} items={tabs} />

            {actionError ? <Alert tone="error">{actionError}</Alert> : null}
            {documents.isError ? <Alert tone="error">Die Dokumente konnten nicht geladen werden.</Alert> : null}

            {documents.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={filter === "All" ? "Noch keine Dokumente" : "Keine Dokumente dieses Typs"}
                description="Lade links deinen Lebenslauf, Zeugnisse oder Zertifikate hoch."
              />
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((item) => {
                  const Icon = item.contentType.startsWith("image/") ? FileImage : typeIcons[item.documentType];
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.fileName}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge tone="primary">{documentTypeLabels[item.documentType]}</Badge>
                          <span>{formatBytes(item.sizeInBytes)}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString("de-DE")}</span>
                          {item.jobApplicationLabel ? <span>{item.jobApplicationLabel}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="icon" aria-label="Herunterladen" onClick={() => void handleDownload(item)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
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
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Dokument bearbeiten"
        description={editing?.fileName}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Abbrechen
            </Button>
            <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {editError ? <Alert tone="error">{editError}</Alert> : null}
          <Field label="Dokumenttyp">
            <Select value={editType} onChange={(event) => setEditType(event.target.value as DocumentType)}>
              {typeSelectOptions}
            </Select>
          </Field>
          <Field label="Bewerbung (optional)">
            <Select value={editApplicationId} onChange={(event) => setEditApplicationId(event.target.value)}>
              {applicationSelectOptions}
            </Select>
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        tone="destructive"
        title="Dokument löschen?"
        description={`„${deleting?.fileName ?? ""}“ wird dauerhaft gelöscht.`}
        confirmLabel="Löschen"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
