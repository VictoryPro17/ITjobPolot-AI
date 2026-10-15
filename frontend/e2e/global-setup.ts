/**
 * Prueft vor dem Lauf, ob API und Datenbank erreichbar sind, und bricht sonst mit
 * einer verstaendlichen Meldung ab statt mit vielen einzelnen Timeouts.
 */
export default async function globalSetup() {
  const apiUrl = process.env.E2E_API_URL ?? "http://localhost:5042";

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/health/database`);
  } catch {
    throw new Error(
      `Die API ist unter ${apiUrl} nicht erreichbar. Starte sie mit erhoehten Limits, z. B.:\n` +
        "  RateLimiting__GlobalPermitLimit=100000 RateLimiting__AuthPermitLimit=1000 dotnet run --project src/JobPilot.Api",
    );
  }

  if (!response.ok) {
    throw new Error(`Die Datenbank ist nicht erreichbar (HTTP ${response.status}). Laeuft der PostgreSQL-Container?`);
  }

  // Mailpit faengt die E-Mails ab (Bestaetigung, Passwort zuruecksetzen).
  const mailpitUrl = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:8025";
  try {
    await fetch(`${mailpitUrl}/api/v1/info`);
  } catch {
    throw new Error(`Mailpit ist unter ${mailpitUrl} nicht erreichbar. Starte es mit: docker compose up -d`);
  }
}
