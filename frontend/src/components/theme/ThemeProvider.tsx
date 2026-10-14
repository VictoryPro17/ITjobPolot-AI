import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
/** Gewaehlte Einstellung; "system" folgt dem Betriebssystem. */
export type ThemePreference = Theme | "system";
export type AccentColor = "blue" | "green" | "purple";

interface ThemeContextValue {
  /** Tatsaechlich angezeigtes Theme. */
  theme: Theme;
  preference: ThemePreference;
  accent: AccentColor;
  setPreference: (preference: ThemePreference) => void;
  setAccent: (accent: AccentColor) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "jobpilot.theme";
const ACCENT_KEY = "jobpilot.accent";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function isAccentColor(value: unknown): value is AccentColor {
  return value === "blue" || value === "green" || value === "purple";
}

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function readStored<T>(key: string, guard: (value: unknown) => value is T, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return guard(stored) ? stored : fallback;
  } catch {
    /* Zugriff auf localStorage kann blockiert sein. */
    return fallback;
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Persistenz ist optional. */
  }
}

/**
 * Farbschema (hell/dunkel/System) und Akzentfarbe. Lokal gespeichert, damit die Seite
 * ohne Flackern startet; massgeblich ist nach der Anmeldung der Wert im Konto.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStored(THEME_KEY, isThemePreference, "system"));
  const [accent, setAccentState] = useState<AccentColor>(() => readStored(ACCENT_KEY, isAccentColor, "blue"));
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
    document.documentElement.dataset.accent = accent;
    store(ACCENT_KEY, accent);
  }, [accent]);

  useEffect(() => store(THEME_KEY, preference), [preference]);

  const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), []);
  const setAccent = useCallback((next: AccentColor) => setAccentState(next), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, accent, setPreference, setAccent }),
    [theme, preference, accent, setPreference, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
