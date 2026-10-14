import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
/** Gewaehlte Einstellung; "system" folgt dem Betriebssystem. */
export type ThemePreference = Theme | "system";

interface ThemeContextValue {
  /** Tatsaechlich angezeigtes Theme. */
  theme: Theme;
  preference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "jobpilot.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function readInitialPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* Zugriff auf localStorage kann blockiert sein. */
  }

  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialPreference);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme: Theme = preference === "system" ? system : preference;

  // Aenderungen der Systemeinstellung live uebernehmen.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const handler = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* Persistenz ist optional. */
    }
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), []);
  const setTheme = useCallback((next: Theme) => setPreferenceState(next), []);
  const toggleTheme = useCallback(() => setPreferenceState(theme === "dark" ? "light" : "dark"), [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, toggleTheme, setTheme, setPreference }),
    [theme, preference, toggleTheme, setTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
