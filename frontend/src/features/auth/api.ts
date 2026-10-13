import { apiFetch } from "@/lib/api";

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  targetJobTitle: string | null;
  location: string | null;
  profileSummary: string | null;
  experienceSummary: string | null;
  educationSummary: string | null;
  resumeText: string | null;
  skills: string[];
  themePreference: string;
  roles: string[];
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiFetch<CurrentUser>("/auth/me");
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function login(request: LoginRequest) {
  return apiFetch<CurrentUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function register(request: RegisterRequest) {
  return apiFetch<CurrentUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export interface UpdateProfileRequest {
  firstName: string | null;
  lastName: string | null;
  targetJobTitle: string | null;
  location: string | null;
  profileSummary: string | null;
  experienceSummary: string | null;
  educationSummary: string | null;
  resumeText: string | null;
  skills: string[] | null;
  themePreference: string | null;
}

export function updateProfile(request: UpdateProfileRequest) {
  return apiFetch<CurrentUser>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export interface ResumeProfileSuggestion {
  resumeText: string;
  firstName: string | null;
  lastName: string | null;
  targetJobTitle: string | null;
  location: string | null;
  profileSummary: string | null;
  experienceSummary: string | null;
  educationSummary: string | null;
  skills: string[];
}

export function uploadResume(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<ResumeProfileSuggestion>("/auth/profile/resume", {
    method: "POST",
    body: formData,
  });
}

export function extractResumeProfile(resumeText: string) {
  return apiFetch<ResumeProfileSuggestion>("/auth/profile/resume/extract", {
    method: "POST",
    body: JSON.stringify({ resumeText }),
  });
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(request: ChangePasswordRequest) {
  return apiFetch<void>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
