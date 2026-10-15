import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCurrentUser,
  login,
  logout,
  register,
  type CurrentUser,
  type LoginRequest,
  type RegisterRequest,
} from "@/features/auth/api";

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  /** Der Server war nicht erreichbar (kein 401): Sitzung unbekannt, nicht "abgemeldet". */
  isError: boolean;
  retry: () => void;
  login: (request: LoginRequest) => Promise<CurrentUser>;
  register: (request: RegisterRequest) => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  });

  // Bei jedem Sitzungswechsel den gesamten Cache leeren, damit nie Daten einer vorherigen
  // Sitzung (z. B. eines anderen Benutzers im selben Tab) angezeigt werden.
  function startSession(user: CurrentUser | null) {
    queryClient.clear();
    queryClient.setQueryData(["auth", "me"], user);
  }

  const loginMutation = useMutation({ mutationFn: login, onSuccess: startSession });
  const registerMutation = useMutation({ mutationFn: register, onSuccess: startSession });
  const logoutMutation = useMutation({ mutationFn: logout, onSuccess: () => startSession(null) });

  async function safeLogout() {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Abmelden fehlgeschlagen (z. B. Netzwerk): Sitzungsstatus neu laden statt einen
      // unbehandelten Fehler zu werfen; bleibt die Sitzung gueltig, bleibt die Ansicht.
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: userQuery.data ?? null,
        isLoading: userQuery.isLoading,
        isError: userQuery.isError,
        retry: () => void userQuery.refetch(),
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
        logout: safeLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  }
  return context;
}
