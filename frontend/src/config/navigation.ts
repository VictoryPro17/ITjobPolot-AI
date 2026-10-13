import {
  Bell,
  BarChart3,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bewerbungen", label: "Meine Bewerbungen", icon: Briefcase },
  { to: "/board", label: "Kanban-Board", icon: KanbanSquare },
  { to: "/ki-assistent", label: "KI-Assistent", icon: Sparkles },
  { to: "/dokumente", label: "Dokumente", icon: FileText },
  { to: "/statistiken", label: "Statistiken", icon: BarChart3 },
  { to: "/erinnerungen", label: "Erinnerungen", icon: Bell },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];