import { randomUUID } from "node:crypto";

import { test as base, expect, request as playwrightRequest, type APIRequestContext, type Page } from "@playwright/test";

export const TEST_PASSWORD = "Testpasswort123";

export type ApplicationStatus = "Draft" | "Applied" | "Interview" | "Offer" | "Accepted" | "Rejected";

export interface SeedApplication {
  companyName: string;
  jobTitle: string;
  status?: ApplicationStatus;
  location?: string;
  workModel?: "Unspecified" | "OnSite" | "Hybrid" | "Remote";
  appliedOn?: string | null;
  technologies?: string[];
  jobDescription?: string;
  interviewAt?: string | null;
}

export interface CreatedApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  status: ApplicationStatus;
}

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  /** Angemeldeter API-Client desselben Benutzers, z. B. zum Anlegen von Testdaten. */
  api: APIRequestContext;
  createApplication: (data: SeedApplication) => Promise<CreatedApplication>;
  createApplications: (count: number, data: (index: number) => SeedApplication) => Promise<CreatedApplication[]>;
}

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${randomUUID()}@example.com`;
}

function today() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Legt einen API-Client mit frischem, angemeldetem Konto an. */
export async function registerUser(
  baseURL: string,
  firstName = "Erika",
  options: { email?: string; lastName?: string; onboarded?: boolean; confirmed?: boolean } = {},
): Promise<TestUser> {
  const api = await playwrightRequest.newContext({ baseURL });
  const email = options.email ?? uniqueEmail();

  // Nur Mails nach der Registrierung beachten (bei wiederverwendeten Adressen liegen alte im Postfach).
  const registeredAt = new Date(Date.now() - 2_000);
  const response = await api.post("/api/auth/register", {
    data: { email, password: TEST_PASSWORD, firstName, lastName: options.lastName ?? "Test" },
  });
  expect(response.status(), `Registrierung fehlgeschlagen: ${await response.text()}`).toBe(201);

  // 1. E-Mail-Adresse ueber den echten Link aus Mailpit bestaetigen (Pflicht; ohne sie sperrt die API).
  if (options.confirmed !== false) {
    const link = await waitForMailLink(email, "/email-bestaetigen", { after: registeredAt });
    const confirm = await api.post("/api/auth/confirm-email", {
      data: { userId: link.searchParams.get("userId"), token: link.searchParams.get("token") },
    });
    expect(confirm.status(), `E-Mail-Bestaetigung fehlgeschlagen: ${await confirm.text()}`).toBe(204);
  }

  // 2. Pflicht-Einstieg (Profil) per API erledigen; Tests des Einstiegs selbst setzen onboarded: false.
  //    Ohne Bestaetigung ist das Profil gesperrt, daher dann ueberspringen.
  if (options.onboarded !== false && options.confirmed !== false) {
    const profile = await api.put("/api/auth/profile", {
      data: {
        firstName,
        lastName: options.lastName ?? "Test",
        targetJobTitle: "Softwareentwickler",
        location: null,
        profileSummary: null,
        experienceSummary: null,
        educationSummary: null,
        resumeText: null,
        skills: ["TypeScript"],
        themePreference: null,
        accentColor: null,
      },
    });
    expect(profile.ok(), `Einstieg abschliessen fehlgeschlagen: ${await profile.text()}`).toBeTruthy();
  }

  async function createApplication(data: SeedApplication): Promise<CreatedApplication> {
    const status = data.status ?? "Applied";
    const created = await api.post("/api/job-applications", {
      data: {
        employmentType: "FullTime",
        workModel: "Unspecified",
        technologies: [],
        ...data,
        status,
        appliedOn: data.appliedOn === undefined ? (status === "Draft" ? null : today()) : data.appliedOn,
      },
    });
    expect(created.status(), `Bewerbung anlegen fehlgeschlagen: ${await created.text()}`).toBe(201);
    return (await created.json()) as CreatedApplication;
  }

  async function createApplications(count: number, data: (index: number) => SeedApplication) {
    const result: CreatedApplication[] = [];
    // Nacheinander, damit "zuletzt geaendert" eine stabile Reihenfolge ergibt.
    for (let index = 1; index <= count; index++) {
      result.push(await createApplication(data(index)));
    }
    return result;
  }

  return { email, password: TEST_PASSWORD, firstName, api, createApplication, createApplications };
}

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:8025";

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

/**
 * Wartet auf die neueste Mail an <email>, deren Text einen Link auf <path> enthaelt, und liefert
 * diesen Link. Mails werden im Hintergrund versendet, daher wird kurz abgefragt.
 */
export async function waitForMailLink(email: string, path: string, options: { after?: Date; timeoutMs?: number } = {}): Promise<URL> {
  const deadline = Date.now() + (options.timeoutMs ?? 15_000);
  while (Date.now() < deadline) {
    const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=20`);
    if (response.ok) {
      const { messages } = (await response.json()) as { messages: (MailpitSummary & { Created: string })[] };
      for (const message of messages ?? []) {
        if (options.after && new Date(message.Created) < options.after) continue;
        const detail = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json()) as { Text: string };
        const link = (detail.Text.match(/https?:\/\/\S+/g) ?? []).find((candidate) => new URL(candidate).pathname === path);
        if (link) return new URL(link);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Keine E-Mail mit Link auf ${path} an ${email} in Mailpit gefunden. Laeuft Mailpit (docker compose up -d)?`);
}

/** Loescht das Konto samt Daten, damit keine Testkonten in der Datenbank bleiben. */
export async function deleteUser(user: TestUser) {
  await user.api.delete("/api/auth/account", { data: { password: user.password } });
  await user.api.dispose();
}

/** Meldet sich mit vorhandenen Zugangsdaten an und loescht das Konto (fuer im Browser registrierte Konten). */
export async function deleteAccount(baseURL: string, email: string, password = TEST_PASSWORD) {
  const api = await playwrightRequest.newContext({ baseURL });
  const login = await api.post("/api/auth/login", { data: { email, password, rememberMe: false } });
  expect(login.ok(), "Anmeldung zum Aufraeumen fehlgeschlagen").toBeTruthy();
  await api.delete("/api/auth/account", { data: { password } });
  await api.dispose();
}

/** Uebernimmt die Anmeldung des API-Clients in den Browser. */
export async function signIn(page: Page, user: TestUser) {
  const state = await user.api.storageState();
  await page.context().addCookies(state.cookies);
}

/** Oeffnet auf schmalen Bildschirmen die Navigation; auf dem Desktop ist sie immer sichtbar. */
export async function openNavigation(page: Page) {
  const toggle = page.getByRole("button", { name: "Navigation öffnen" });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

type Fixtures = {
  /** Frisch registrierter Benutzer, der im Browser bereits angemeldet ist. */
  user: TestUser;
  /** Sammelt JS-Fehler im Browser; der Test schlaegt fehl, wenn welche auftreten. */
  browserErrors: string[];
};

export const test = base.extend<Fixtures>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        // Fehlgeschlagene Netzwerkanfragen (z. B. gewollte 400/401) protokolliert der Browser
        // selbst als Konsolenfehler; sie werden in den Tests ueber die Oberflaeche geprueft.
        if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
          errors.push(`console: ${message.text()}`);
        }
      });
      await use(errors);
      expect(errors, "Im Browser sind Fehler aufgetreten").toEqual([]);
    },
    { auto: true },
  ],

  user: async ({ page, baseURL }, use) => {
    const user = await registerUser(baseURL!);
    await signIn(page, user);
    await use(user);
    await deleteUser(user);
  },
});

export { expect };
