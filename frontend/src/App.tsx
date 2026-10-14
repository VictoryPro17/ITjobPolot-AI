import { Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { ApplicationsPage } from "@/pages/ApplicationsPage";
import { ApplicationFormPage } from "@/pages/ApplicationFormPage";
import { KanbanPage } from "@/pages/KanbanPage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AiAssistantPage } from "@/pages/AiAssistantPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { RemindersPage } from "@/pages/RemindersPage";

export default function App() {
  return (
    <Routes>
      <Route path="anmelden" element={<LoginPage />} />
      <Route path="registrieren" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="bewerbungen" element={<ApplicationsPage />} />
        <Route path="bewerbungen/neu" element={<ApplicationFormPage />} />
        <Route path="bewerbungen/:id" element={<ApplicationFormPage />} />
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
