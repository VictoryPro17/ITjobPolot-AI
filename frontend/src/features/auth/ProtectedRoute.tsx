import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Sitzung wird geladen...</div>;
  }

  if (!user) {
    return <Navigate to="/anmelden" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
