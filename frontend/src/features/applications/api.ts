import { apiFetch } from "@/lib/api";

export type ApplicationStatus = "Draft" | "Applied" | "Interview" | "Offer" | "Accepted" | "Rejected";
export type EmploymentType = "Unspecified" | "FullTime" | "PartTime" | "Contract" | "Internship" | "Freelance";
export type WorkModel = "Unspecified" | "OnSite" | "Hybrid" | "Remote";

export interface ApplicationListItem {
  id: string;
  companyName: string;
  jobTitle: string;
  location: string | null;
  employmentType: EmploymentType;
  workModel: WorkModel;
  status: ApplicationStatus;
  appliedOn: string | null;
  interviewAt: string | null;
  technologies: string[];
  isOpen: boolean;
  updatedAt: string;
}

export interface PagedApplications {
  items: ApplicationListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ApplicationRequest {
  companyName: string;
  jobTitle: string;
  location: string;
  employmentType: EmploymentType;
  workModel: WorkModel;
  salary: string;
  jobPostingUrl: string;
  appliedOn: string | null;
  status: ApplicationStatus;
  jobDescription: string;
  technologies: string[];
  notes: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  interviewAt: string | null;
  interviewLocation: string;
}

const statusLabels: Record<ApplicationStatus, string> = {
  Draft: "Entwurf",
  Applied: "Beworben",
  Interview: "Vorstellungsgespräch",
  Offer: "Angebot",
  Accepted: "Zusage",
  Rejected: "Absage",
};

export const applicationStatuses = Object.entries(statusLabels) as [ApplicationStatus, string][];

export function getStatusLabel(status: ApplicationStatus) {
  return statusLabels[status];
}

export async function getApplications(params: { search: string; status: ApplicationStatus | ""; page: number }) {
  const query = new URLSearchParams({ page: String(params.page), pageSize: "10", sortBy: "UpdatedAt", sortDescending: "true" });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  return apiFetch<PagedApplications>(`/job-applications?${query}`);
}

export function getApplication(id: string) {
  return apiFetch<ApplicationRequest & { id: string }>(`/job-applications/${id}`);
}

export function createApplication(request: ApplicationRequest) {
  return apiFetch("/job-applications", { method: "POST", body: JSON.stringify(request) });
}

export function updateApplication(id: string, request: ApplicationRequest) {
  return apiFetch(`/job-applications/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export function deleteApplication(id: string) {
  return apiFetch<void>(`/job-applications/${id}`, { method: "DELETE" });
}

export interface ApplicationSummary {
  total: number;
  thisMonth: number;
  open: number;
  interviews: number;
  accepted: number;
  rejected: number;
  byStatus: Record<ApplicationStatus, number>;
}

export function getSummary() {
  return apiFetch<ApplicationSummary>("/job-applications/summary");
}

export function changeStatus(id: string, status: ApplicationStatus, comment?: string) {
  return apiFetch(`/job-applications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, comment }),
  });
}

export interface MonthlyStats {
  year: number;
  month: number;
  applied: number;
  interviews: number;
  offers: number;
  accepted: number;
  rejected: number;
}

export interface Statistics {
  totalApplications: number;
  totalInterviews: number;
  totalOffers: number;
  totalAccepted: number;
  totalRejected: number;
  interviewRate: number;
  offerRate: number;
  acceptanceRate: number;
  monthlyData: MonthlyStats[];
}

export function getStatistics() {
  return apiFetch<Statistics>("/job-applications/statistics");
}

export type WritingStyle = "Professional" | "Formal" | "Modern" | "Concise" | "Enthusiastic";

export interface AiAnalysis {
  id: string;
  jobApplicationId: string;
  matchScore: number;
  summary: string;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  suggestedLearningTopics: string[];
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export interface GeneratedCoverLetter {
  id: string;
  jobApplicationId: string;
  title: string;
  content: string;
  companyName: string | null;
  jobTitle: string | null;
  style: WritingStyle;
  isDraft: boolean;
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export function analyzeApplication(applicationId: string) {
  return apiFetch<AiAnalysis>(`/ai/job-applications/${applicationId}/analyze`, { method: "POST" });
}

export function generateCoverLetter(
  applicationId: string,
  payload: { title: string; style: WritingStyle; isDraft: boolean },
) {
  return apiFetch<GeneratedCoverLetter>(`/ai/job-applications/${applicationId}/cover-letters`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
