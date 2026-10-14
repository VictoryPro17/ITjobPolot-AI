import { useCallback, useState } from "react";

import type { ApplicationStatus } from "@/features/applications/api";

export type CardDensity = "compact" | "detailed";
export type BoardSort = "updated" | "applied" | "company";

export interface BoardPreferences {
  density: CardDensity;
  sort: BoardSort;
  /** null = noch nie geaendert, dann gilt die Standardregel fuer grosse abgeschlossene Spalten. */
  collapsed: ApplicationStatus[] | null;
  hideOldClosed: boolean;
}

const STORAGE_KEY = "jobpilot.board.v1";

const defaults: BoardPreferences = { density: "compact", sort: "updated", collapsed: null, hideOldClosed: true };

function load(): BoardPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<BoardPreferences>;
    return {
      density: parsed.density === "detailed" ? "detailed" : "compact",
      sort: parsed.sort === "applied" || parsed.sort === "company" ? parsed.sort : "updated",
      collapsed: Array.isArray(parsed.collapsed) ? parsed.collapsed : null,
      hideOldClosed: parsed.hideOldClosed !== false,
    };
  } catch {
    // Gesperrter oder beschaedigter Speicher: Standardwerte verwenden.
    return defaults;
  }
}

/** Board-Einstellungen pro Browser; funktioniert auch ohne localStorage. */
export function useBoardPreferences() {
  const [preferences, setPreferences] = useState<BoardPreferences>(load);

  const update = useCallback((patch: Partial<BoardPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Speichern ist optional.
      }
      return next;
    });
  }, []);

  return [preferences, update] as const;
}
