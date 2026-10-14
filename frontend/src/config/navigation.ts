import {
  Bell,
  BarChart3,
  Bot,
  Briefcase,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

/** Kennung fuer optionale Zaehler am Menuepunkt. */
export type NavigationBadge = "openApplications" | "overdueReminders";

export interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: NavigationBadge;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Übersicht",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Bewerbungen",
    items: [
      { to: "/bewerbungen", label: "Meine Bewerbungen", icon: Briefcase, badge: "openApplications" },
      { to: "/board", label: "Kanban-Board", icon: KanbanSquare },
      { to: "/erinnerungen", label: "Erinnerungen", icon: Bell, badge: "overdueReminders" },
    ],
  },
  {
    label: "Werkzeuge",
    items: [
      { to: "/ki-assistent", label: "KI-Assistent", icon: Bot },
      { to: "/dokumente", label: "Dokumente", icon: FileText },
      { to: "/statistiken", label: "Statistiken", icon: BarChart3 },
    ],
  },
];

/** Unten in der Seitenleiste fixiert. */
export const settingsNavigationItem: NavigationItem = { to: "/einstellungen", label: "Einstellungen", icon: Settings };
