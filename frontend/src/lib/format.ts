/** Einheitliche deutsche Datumsformate fuer die Oberflaeche. */

const relativeFormatter = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

/** Datum (ISO-Datum oder Zeitpunkt) als TT.MM.JJJJ, leer als Gedankenstrich. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "–";
  // Reine Datumswerte (JJJJ-MM-TT) nicht als UTC parsen, sonst verschiebt sich der Tag.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDate(value) : new Date(value);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Zeitpunkt als TT.MM.JJJJ, HH:MM. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

/** Relative Angabe wie "vor 3 Tagen", "morgen" oder "in 2 Stunden". */
export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return "–";
  const diffMs = new Date(value).getTime() - now.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relativeFormatter.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return relativeFormatter.format(months, "month");
  return relativeFormatter.format(Math.round(months / 12), "year");
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
