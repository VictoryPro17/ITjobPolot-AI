import { CheckCircle2, FilePen, Gift, MessagesSquare, Send, XCircle, type LucideIcon } from "lucide-react";

import type { ApplicationStatus } from "@/features/applications/api";

export const applicationStatusOrder: ApplicationStatus[] = ["Draft", "Applied", "Interview", "Offer", "Accepted", "Rejected"];

export const statusConfig: Record<
  ApplicationStatus,
  { label: string; description: string; icon: LucideIcon; colorVar: string; className: string }
> = {
  Draft: {
    label: "Entwurf",
    description: "Noch nicht verschickt",
    icon: FilePen,
    colorVar: "var(--status-draft)",
    className: "border-status-draft/30 bg-status-draft/10",
  },
  Applied: {
    label: "Beworben",
    description: "Bewerbung ist verschickt",
    icon: Send,
    colorVar: "var(--status-applied)",
    className: "border-status-applied/30 bg-status-applied/10",
  },
  Interview: {
    label: "Gespräch",
    description: "Einladung zum Gespräch",
    icon: MessagesSquare,
    colorVar: "var(--status-interview)",
    className: "border-status-interview/30 bg-status-interview/10",
  },
  Offer: {
    label: "Angebot",
    description: "Vertragsangebot liegt vor",
    icon: Gift,
    colorVar: "var(--status-offer)",
    className: "border-status-offer/30 bg-status-offer/10",
  },
  Accepted: {
    label: "Zusage",
    description: "Angebot angenommen",
    icon: CheckCircle2,
    colorVar: "var(--status-accepted)",
    className: "border-status-accepted/30 bg-status-accepted/10",
  },
  Rejected: {
    label: "Absage",
    description: "Prozess beendet",
    icon: XCircle,
    colorVar: "var(--status-rejected)",
    className: "border-status-rejected/30 bg-status-rejected/10",
  },
};

export function getStatusLabel(status: ApplicationStatus) {
  return statusConfig[status].label;
}
