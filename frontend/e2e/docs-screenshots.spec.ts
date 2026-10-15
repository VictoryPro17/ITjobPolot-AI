import { mkdir } from "node:fs/promises";
import path from "node:path";

import { devices, expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";

import { deleteAccount, deleteUser, registerUser, type SeedApplication, type TestUser } from "./fixtures";

/**
 * Screenshots fuer README und Doku mit fiktiven Beispieldaten (Firmen- und Personennamen
 * sind erfunden). Aufruf: npm run docs:screenshots
 */
const OUT_DIR = path.join("..", "docs", "screenshots");
const DEMO_EMAIL = "alex.beispiel@example.com";
const desktop: BrowserContextOptions = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

function daysAgo(days: number) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function inDays(days: number, hour = 10) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const description =
  "Wir suchen eine Entwicklerin oder einen Entwickler mit Erfahrung in C#, ASP.NET Core und PostgreSQL. " +
  "Kenntnisse in React und TypeScript sowie Docker und Azure sind von Vorteil. Du arbeitest in einem agilen Team mit Scrum.";

const applications: SeedApplication[] = [
  { companyName: "Contoso", jobTitle: "Backend Developer (.NET)", status: "Interview", location: "Berlin", workModel: "Hybrid", appliedOn: daysAgo(12), interviewAt: inDays(3), technologies: ["C#", "ASP.NET Core", "PostgreSQL", "Docker"], jobDescription: description },
  { companyName: "Fabrikam", jobTitle: "Fullstack Developer", status: "Applied", location: "Hamburg", workModel: "Remote", appliedOn: daysAgo(4), technologies: ["React", "TypeScript", "C#"] },
  { companyName: "Northwind Traders", jobTitle: "Junior Software Engineer", status: "Offer", location: "München", workModel: "OnSite", appliedOn: daysAgo(30), technologies: ["Java", "Spring", "SQL"] },
  { companyName: "Tailspin Toys", jobTitle: "Frontend Developer", status: "Applied", location: "Köln", workModel: "Hybrid", appliedOn: daysAgo(8), technologies: ["React", "Tailwind", "TypeScript"] },
  { companyName: "Litware", jobTitle: "Cloud Engineer", status: "Rejected", location: "Frankfurt", workModel: "Hybrid", appliedOn: daysAgo(55), technologies: ["Azure", "Terraform", "Kubernetes"] },
  { companyName: "Adventure Works", jobTitle: "DevOps Engineer", status: "Interview", location: "Leipzig", workModel: "Remote", appliedOn: daysAgo(18), interviewAt: inDays(6, 14), technologies: ["Docker", "GitHub Actions", "Linux"] },
  { companyName: "Proseware", jobTitle: "Data Engineer", status: "Applied", location: "Berlin", workModel: "Remote", appliedOn: daysAgo(2), technologies: ["Python", "SQL", "Airflow"] },
  { companyName: "Wingtip Toys", jobTitle: "Mobile Developer", status: "Draft", location: "Stuttgart", workModel: "Hybrid", appliedOn: null, technologies: ["Flutter", "Dart"] },
  { companyName: "Woodgrove Bank", jobTitle: "Software Developer Finance", status: "Accepted", location: "Frankfurt", workModel: "Hybrid", appliedOn: daysAgo(70), technologies: ["C#", "SQL Server"] },
  { companyName: "Lucerne Publishing", jobTitle: "Web Developer", status: "Rejected", location: "Düsseldorf", workModel: "OnSite", appliedOn: daysAgo(40), technologies: ["PHP", "Vue"] },
  { companyName: "Margie's Travel", jobTitle: "Backend Developer Node.js", status: "Applied", location: "Hamburg", workModel: "Remote", appliedOn: daysAgo(15), technologies: ["Node.js", "TypeScript"] },
  { companyName: "Coho Winery", jobTitle: "IT-Support & Entwicklung", status: "Rejected", location: "Mainz", workModel: "OnSite", appliedOn: daysAgo(80), technologies: ["PowerShell", "C#"] },
  { companyName: "Alpine Ski House", jobTitle: "QA Engineer", status: "Applied", location: "München", workModel: "Hybrid", appliedOn: daysAgo(25), technologies: ["Playwright", "TypeScript"] },
  { companyName: "Graphic Design Institute", jobTitle: "UI Developer", status: "Draft", location: "Berlin", workModel: "Remote", appliedOn: null, technologies: ["Figma", "React"] },
];

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  // Diagramm-Animationen und Schriftarten abwarten (nur fuer die Optik der Bilder).
  await page.waitForTimeout(700);
}

async function shoot(page: Page, url: string, name: string, options: { fullPage?: boolean } = {}) {
  await page.goto(url);
  await settle(page);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: options.fullPage ?? false });
}

async function signedInPage(browser: Browser, baseURL: string, user: TestUser, options: BrowserContextOptions) {
  const context = await browser.newContext({ baseURL, locale: "de-DE", timezoneId: "Europe/Berlin", ...options });
  await context.addCookies((await user.api.storageState()).cookies);
  return { context, page: await context.newPage() };
}

test("Screenshots für die Dokumentation", async ({ browser, baseURL }) => {
  await mkdir(OUT_DIR, { recursive: true });

  // Reste eines abgebrochenen Laufs entfernen.
  await deleteAccount(baseURL!, DEMO_EMAIL).catch(() => undefined);
  const user = await registerUser(baseURL!, "Alex", { email: DEMO_EMAIL, lastName: "Beispiel" });

  try {
    // --- Beispieldaten ---
    const profile = await user.api.put("/api/auth/profile", {
      data: {
        firstName: "Alex",
        lastName: "Beispiel",
        targetJobTitle: "Backend Developer",
        location: "Berlin",
        profileSummary: "Backend-Entwickler mit Schwerpunkt .NET, APIs und Datenbanken.",
        experienceSummary: "3 Jahre Erfahrung als Softwareentwickler mit C#, ASP.NET Core und PostgreSQL.",
        educationSummary: "B.Sc. Informatik, Zertifikat AZ-900.",
        resumeText: "Alex Beispiel – Backend Developer. Erfahrung mit C#, ASP.NET Core, PostgreSQL, Docker, React und TypeScript.",
        skills: ["C#", "ASP.NET Core", "PostgreSQL", "Docker", "React", "TypeScript", "Git", "Scrum"],
        themePreference: "system",
        accentColor: "blue",
      },
    });
    expect(profile.ok()).toBeTruthy();

    const created = [];
    for (const application of applications) {
      created.push(await user.createApplication(application));
    }
    const featured = created[0];

    await user.api.post(`/api/job-applications/${featured.id}/notes`, { data: { content: "Telefonat mit dem Teamlead: technisches Gespräch mit Live-Coding in C#." } });
    await user.api.post(`/api/job-applications/${featured.id}/notes`, { data: { content: "Unterlagen vollständig, Rückmeldung innerhalb einer Woche angekündigt." } });
    await user.api.post("/api/reminders", { data: { title: "Nachfassen: Fabrikam", description: null, dueAt: inDays(2, 9), reminderType: "FollowUp", jobApplicationId: created[1].id } });
    await user.api.post("/api/reminders", { data: { title: "Gespräch vorbereiten: Contoso", description: "Projekte und Fragen notieren", dueAt: inDays(2, 18), reminderType: "Interview", jobApplicationId: featured.id } });
    await user.api.post("/api/reminders", { data: { title: "Unterlagen nachreichen: Tailspin Toys", description: null, dueAt: inDays(-1, 12), reminderType: "Deadline", jobApplicationId: created[3].id } });
    await user.api.post("/api/reminders", { data: { title: "Rückmeldung Northwind abwarten", description: "Angebot bis Freitag prüfen", dueAt: inDays(5, 9), reminderType: "Custom", jobApplicationId: created[2].id } });

    // Zwei kleine Textdokumente (die API prueft Endung und Inhalt; Text ist erlaubt).
    for (const [name, type, applicationId, text] of [
      ["Lebenslauf_Alex_Beispiel.txt", "Resume", null, "Alex Beispiel – Lebenslauf (Beispiel)"],
      ["Anschreiben_Contoso.txt", "CoverLetter", featured.id, "Anschreiben an Contoso (Beispiel)"],
    ] as const) {
      const upload = await user.api.post("/api/documents", {
        multipart: {
          file: { name, mimeType: "text/plain", buffer: Buffer.from(text, "utf8") },
          documentType: type,
          ...(applicationId ? { jobApplicationId: applicationId } : {}),
        },
      });
      expect(upload.ok(), await upload.text()).toBeTruthy();
    }
    // Analyse fuer die Detailseite; mit lokaler KI kann das einige Sekunden dauern.
    const analysis = await user.api.post(`/api/ai/job-applications/${featured.id}/analyze`, { timeout: 180_000 });
    expect(analysis.ok()).toBeTruthy();

    // --- Desktop hell ---
    const light = await signedInPage(browser, baseURL!, user, { ...desktop, colorScheme: "light" });
    await shoot(light.page, "/", "dashboard");
    await shoot(light.page, "/bewerbungen", "bewerbungen");
    await shoot(light.page, "/board", "kanban");
    await shoot(light.page, `/bewerbungen/${featured.id}`, "detail");
    await shoot(light.page, `/bewerbungen/${featured.id}?tab=aktivitaet`, "detail-aktivitaet");
    await shoot(light.page, `/bewerbungen/${featured.id}?tab=ki`, "detail-ki");
    await shoot(light.page, "/statistiken", "statistiken", { fullPage: true });
    await shoot(light.page, "/einstellungen?bereich=darstellung", "einstellungen-darstellung");
    await shoot(light.page, "/einstellungen", "einstellungen-profil");
    await shoot(light.page, "/einstellungen?bereich=lebenslauf", "einstellungen-lebenslauf");
    await shoot(light.page, "/einstellungen?bereich=daten", "einstellungen-daten", { fullPage: true });
    await shoot(light.page, "/bewerbungen/neu", "formular");
    await shoot(light.page, "/erinnerungen", "erinnerungen");
    await shoot(light.page, "/dokumente", "dokumente");
    await shoot(light.page, `/ki-assistent?bewerbung=${featured.id}`, "ki-assistent");

    // Akzentfarben ueber die Einstellungen waehlen (wie ein Benutzer).
    for (const [accent, label] of [["purple", "Lila"], ["green", "Grün"]] as const) {
      await light.page.goto("/einstellungen?bereich=darstellung");
      await light.page.getByRole("radiogroup", { name: "Akzentfarbe" }).getByRole("radio", { name: label }).click();
      await expect(light.page.locator("html")).toHaveAttribute("data-accent", accent);
      await shoot(light.page, "/", `dashboard-${accent}`);
    }
    await light.page.goto("/einstellungen?bereich=darstellung");
    await light.page.getByRole("radiogroup", { name: "Akzentfarbe" }).getByRole("radio", { name: "Blau" }).click();
    await expect.poll(async () => ((await (await user.api.get("/api/auth/me")).json()) as { accentColor: string }).accentColor).toBe("blue");
    await light.context.close();

    // --- Desktop dunkel ("System" folgt dem dunklen Farbschema des Browsers) ---
    const dark = await signedInPage(browser, baseURL!, user, { ...desktop, colorScheme: "dark" });
    await shoot(dark.page, "/", "dashboard-dunkel");
    await shoot(dark.page, `/bewerbungen/${featured.id}`, "detail-dunkel");
    await dark.context.close();

    // --- Handy ---
    const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
    void _ignored;
    const mobile = await signedInPage(browser, baseURL!, user, { ...pixel, colorScheme: "light" });
    await shoot(mobile.page, "/", "mobil-dashboard");
    await shoot(mobile.page, "/board", "mobil-kanban");
    await mobile.context.close();

    // --- Anmeldung (ohne Sitzung) ---
    const anonymous = await browser.newContext({ baseURL, ...desktop, colorScheme: "light", locale: "de-DE" });
    const login = await anonymous.newPage();
    await shoot(login, "/anmelden", "anmeldung");
    await shoot(login, "/registrieren", "registrierung");
    await shoot(login, "/passwort-vergessen", "passwort-vergessen");
    await anonymous.close();

    // --- Wartseite: Konto ist noch nicht bestaetigt ---
    await deleteAccount(baseURL!, "alex.neu@example.com").catch(() => undefined);
    const unconfirmed = await registerUser(baseURL!, "Alex", { lastName: "Beispiel", email: "alex.neu@example.com", confirmed: false });
    try {
      const hint = await signedInPage(browser, baseURL!, unconfirmed, { ...desktop, colorScheme: "light" });
      await shoot(hint.page, "/bestaetigung-ausstehend", "bestaetigung-ausstehend");
      await hint.context.close();
    } finally {
      await deleteUser(unconfirmed);
    }

    // --- Pflicht-Einstieg eines neuen Kontos ---
    const newcomer = await registerUser(baseURL!, "Alex", { lastName: "Beispiel", onboarded: false });
    try {
      const welcome = await signedInPage(browser, baseURL!, newcomer, { ...desktop, colorScheme: "light" });
      await shoot(welcome.page, "/willkommen", "willkommen");
      await welcome.page.getByRole("button", { name: /Selbst ausfüllen/ }).click();
      await welcome.page.getByLabel("Wunschposition *").fill("Backend Developer");
      for (const skill of ["C#", "ASP.NET Core", "PostgreSQL"]) {
        await welcome.page.getByPlaceholder("z. B. C#, React, Docker").fill(skill);
        await welcome.page.getByPlaceholder("z. B. C#, React, Docker").press("Enter");
      }
      await settle(welcome.page);
      await welcome.page.screenshot({ path: path.join(OUT_DIR, "willkommen-profil.png") });
      await welcome.context.close();
    } finally {
      await deleteUser(newcomer);
    }
  } finally {
    await deleteUser(user);
  }
});
