import { apiFetch } from "@/lib/api";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  databaseConnected: boolean | null;
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

export function getDatabaseHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health/database");
}