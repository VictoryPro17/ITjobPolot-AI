import { apiFetch } from "@/lib/api";

export type ReminderType = "Custom" | "Interview" | "Deadline" | "FollowUp";
export type ReminderFilter = "Open" | "Completed" | "All";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  reminderType: ReminderType;
  isCompleted: boolean;
  completedAt: string | null;
  isOverdue: boolean;
  jobApplicationId: string | null;
  jobApplicationLabel: string | null;
  createdAt: string;
}

export interface SaveReminderPayload {
  title: string;
  description: string | null;
  dueAt: string;
  reminderType: ReminderType;
  jobApplicationId: string | null;
}

export const reminderTypeLabels: Record<ReminderType, string> = {
  Custom: "Eigene Aufgabe",
  Interview: "Vorstellungsgespräch",
  Deadline: "Rückmeldefrist",
  FollowUp: "Nachfassen",
};

export function getReminders(filter: ReminderFilter) {
  return apiFetch<Reminder[]>(`/reminders?filter=${filter}`);
}

export function getUpcomingReminders(take = 5) {
  return apiFetch<Reminder[]>(`/reminders/upcoming?take=${take}`);
}

export function createReminder(payload: SaveReminderPayload) {
  return apiFetch<Reminder>("/reminders", { method: "POST", body: JSON.stringify(payload) });
}

export function updateReminder(id: string, payload: SaveReminderPayload) {
  return apiFetch<Reminder>(`/reminders/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function completeReminder(id: string) {
  return apiFetch<Reminder>(`/reminders/${id}/complete`, { method: "POST" });
}

export function reopenReminder(id: string) {
  return apiFetch<Reminder>(`/reminders/${id}/reopen`, { method: "POST" });
}

export function deleteReminder(id: string) {
  return apiFetch<void>(`/reminders/${id}`, { method: "DELETE" });
}
