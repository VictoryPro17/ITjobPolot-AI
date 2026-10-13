/** Fehler einer API-Anfrage inklusive HTTP-Statuscode. */
export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const BASE_URL = "/api";

interface ProblemDetails {
  title?: string;
  detail?: string;
}

/**
 * Zentraler API-Client. `credentials: "include"` ist zwingend, weil die
 * Authentifizierung ueber ein HttpOnly-Cookie laeuft.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { headers, ...rest } = init;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(rest.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as ProblemDetails;
    return problem.detail ?? problem.title ?? defaultMessage(response.status);
  } catch {
    return defaultMessage(response.status);
  }
}

function defaultMessage(status: number): string {
  if (status === 401) return "Nicht angemeldet.";
  if (status === 403) return "Keine Berechtigung für diese Aktion.";
  if (status === 404) return "Die angeforderte Ressource wurde nicht gefunden.";
  if (status >= 500) return "Der Server ist derzeit nicht erreichbar.";
  return `Die Anfrage ist fehlgeschlagen (HTTP ${status}).`;
}