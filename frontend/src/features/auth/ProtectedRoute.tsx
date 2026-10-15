import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";

export const ONBOARDING_PATH = "/willkommen";
export const CONFIRMATION_PENDING_PATH = "/bestaetigung-ausstehend";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Sitzung wird geladen...</div>;
  }

  if (!user) {
    return <Navigate to="/anmelden" replace state={{ from: location.pathname }} />;
  }

  // 1. E-Mail-Bestaetigung ist Pflicht; der Server sperrt ohne sie alle Daten-Endpunkte (403).
  const confirmationOpen = user.emailConfirmed === false;
  if (confirmationOpen && location.pathname !== CONFIRMATION_PENDING_PATH) {
    return <Navigate to={CONFIRMATION_PENDING_PATH} replace />;
  }
  if (!confirmationOpen && location.pathname === CONFIRMATION_PENDING_PATH) {
    return <Navigate to="/" replace />;
  }
  if (confirmationOpen) {
    return <Outlet />;
  }

  // 2. Pflicht-Einstieg: Ohne eingerichtetes Profil fuehrt jede Seite zur Willkommensseite.
  const onboardingOpen = user.onboardingCompleted === false;
  if (onboardingOpen && location.pathname !== ONBOARDING_PATH) {
    return <Navigate to={ONBOARDING_PATH} replace />;
  }
  if (!onboardingOpen && location.pathname === ONBOARDING_PATH) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
