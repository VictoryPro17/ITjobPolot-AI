import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { OnboardingPage } from "@/pages/OnboardingPage";

// Seiten ausser Anmeldung und Dashboard werden erst beim ersten Aufruf geladen,
// damit z. B. die Diagramm-Bibliothek nur auf der Statistikseite ankommt.
const ApplicationsPage = lazy(() => import("@/pages/ApplicationsPage").then((module) => ({ default: module.ApplicationsPage })));
const ApplicationDetailPage = lazy(() => import("@/pages/ApplicationDetailPage").then((module) => ({ default: module.ApplicationDetailPage })));
const ApplicationFormPage = lazy(() => import("@/pages/ApplicationFormPage").then((module) => ({ default: module.ApplicationFormPage })));
const KanbanPage = lazy(() => import("@/pages/KanbanPage").then((module) => ({ default: module.KanbanPage })));
const StatisticsPage = lazy(() => import("@/pages/StatisticsPage").then((module) => ({ default: module.StatisticsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const AiAssistantPage = lazy(() => import("@/pages/AiAssistantPage").then((module) => ({ default: module.AiAssistantPage })));
const DocumentsPage = lazy(() => import("@/pages/DocumentsPage").then((module) => ({ default: module.DocumentsPage })));
const RemindersPage = lazy(() => import("@/pages/RemindersPage").then((module) => ({ default: module.RemindersPage })));

export default function App() {
  return (
    <Routes>
      <Route path="anmelden" element={<LoginPage />} />
      <Route path="registrieren" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="willkommen" element={<OnboardingPage />} />
        <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="bewerbungen" element={<ApplicationsPage />} />
        <Route path="bewerbungen/neu" element={<ApplicationFormPage />} />
        <Route path="bewerbungen/:id" element={<ApplicationDetailPage />} />
        <Route path="bewerbungen/:id/bearbeiten" element={<ApplicationFormPage />} />
        <Route path="board" element={<KanbanPage />} />
        <Route path="ki-assistent" element={<AiAssistantPage />} />
        <Route path="dokumente" element={<DocumentsPage />} />
        <Route path="statistiken" element={<StatisticsPage />} />
        <Route path="erinnerungen" element={<RemindersPage />} />
        <Route path="einstellungen" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
