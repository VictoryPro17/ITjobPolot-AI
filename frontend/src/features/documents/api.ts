import { apiDownload, apiFetch, saveBlob } from "@/lib/api";

export type DocumentType = "Other" | "Resume" | "CoverLetter" | "Reference" | "Certificate";

export interface DocumentItem {
  id: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
  documentType: DocumentType;
  jobApplicationId: string | null;
  jobApplicationLabel: string | null;
  hasExtractedText: boolean;
  createdAt: string;
}

export const documentTypeLabels: Record<DocumentType, string> = {
  Resume: "Lebenslauf",
  CoverLetter: "Anschreiben",
  Reference: "Zeugnis",
  Certificate: "Zertifikat",
  Other: "Sonstiges",
};

export function getDocuments(jobApplicationId?: string) {
  return apiFetch<DocumentItem[]>(jobApplicationId ? `/documents?jobApplicationId=${jobApplicationId}` : "/documents");
}

export function uploadDocument(file: File, documentType: DocumentType, jobApplicationId: string | null) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", documentType);
  if (jobApplicationId) {
    formData.append("jobApplicationId", jobApplicationId);
  }

  return apiFetch<DocumentItem>("/documents", { method: "POST", body: formData });
}

export function updateDocument(id: string, payload: { documentType: DocumentType; jobApplicationId: string | null }) {
  return apiFetch<DocumentItem>(`/documents/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function downloadDocument(id: string) {
  const { blob, fileName } = await apiDownload(`/documents/${id}/download`);
  saveBlob(blob, fileName);
}

export function deleteDocument(id: string) {
  return apiFetch<void>(`/documents/${id}`, { method: "DELETE" });
}
