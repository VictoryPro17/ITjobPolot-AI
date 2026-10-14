/** Fehler einer API-Anfrage inklusive HTTP-Statuscode. */
export class ApiError extends Error {
  public readonly status: number;
  /** Feldfehler aus einer ValidationProblemDetails-Antwort, Schluessel in camelCase. */
  public readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export const BASE_URL = "/api";

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/**
 * Zentraler API-Client. `credentials: "include"` ist zwingend, weil die
 * Authentifizierung ueber ein HttpOnly-Cookie laeuft.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { headers, ...rest } = init;

  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(rest.body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    throw await readError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const problem = (await response.json()) as ProblemDetails;
    const fieldErrors: Record<string, string> = {};
    for (const [key, messages] of Object.entries(problem.errors ?? {})) {
      if (messages.length > 0) {
        fieldErrors[key.charAt(0).toLowerCase() + key.slice(1)] = messages[0];
      }
    }
    // Bei Validierungsfehlern ist die erste konkrete Meldung hilfreicher als der allgemeine Titel.
    const firstFieldError = Object.values(fieldErrors)[0];
    const message = firstFieldError ?? problem.detail ?? problem.title ?? defaultMessage(response.status);
    return new ApiError(response.status, message, fieldErrors);
  } catch {
    return new ApiError(response.status, defaultMessage(response.status));
  }
}

function defaultMessage(status: number): string {
  if (status === 401) return "Nicht angemeldet.";
  if (status === 403) return "Keine Berechtigung für diese Aktion.";
  if (status === 404) return "Die angeforderte Ressource wurde nicht gefunden.";
  if (status >= 500) return "Der Server ist derzeit nicht erreichbar.";
  return `Die Anfrage ist fehlgeschlagen (HTTP ${status}).`;
}

/** Laedt eine Datei (z. B. Export oder Dokument) als Blob herunter. */
export async function apiDownload(path: string, init: RequestInit = {}): Promise<{ blob: Blob; fileName: string }> {
  const { headers, ...rest } = init;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      Accept: "*/*",
      ...headers,
    },
  });

  if (!response.ok) {
    throw await readError(response);
  }

  return {
    blob: await response.blob(),
    fileName: parseFileName(response.headers.get("Content-Disposition")),
  };
}

function parseFileName(contentDisposition: string | null): string {
  if (!contentDisposition) return "download";

  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // Fallback auf den einfachen filename-Parameter
    }
  }

  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return plain ? plain[1].trim() : "download";
}

/** Speichert einen Blob ueber einen temporaeren Download-Link. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
