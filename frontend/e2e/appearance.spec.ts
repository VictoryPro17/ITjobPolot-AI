import { expect, openNavigation, test } from "./fixtures";

test.describe("Darstellung und Navigation", () => {
  test("Kein Theme-Schalter mehr in der Kopfzeile", async ({ page, user }) => {
    void user;
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Design|Theme|Modus/i })).toHaveCount(0);
  });

  test("Akzentfarbe wechseln und nach dem Neuladen behalten", async ({ page, user }) => {
    void user;
    await page.goto("/einstellungen?bereich=darstellung");
    const accent = page.getByRole("radiogroup", { name: "Akzentfarbe" });

    await accent.getByRole("radio", { name: "Grün" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-accent", "green");

    await page.reload();
    await expect(accent.getByRole("radio", { name: "Grün" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveAttribute("data-accent", "green");
  });

  test("Darstellung aus dem Konto wird auf einem neuen Gerät übernommen", async ({ page, user, browser, baseURL }) => {
    await page.goto("/einstellungen?bereich=darstellung");
    await page.getByRole("radiogroup", { name: "Modus" }).getByRole("radio", { name: /Dunkel/ }).click();
    await page.getByRole("radiogroup", { name: "Akzentfarbe" }).getByRole("radio", { name: "Lila" }).click();
    // Speichern abwarten: das Konto liefert die neuen Werte.
    await expect
      .poll(async () => (await (await user.api.get("/api/auth/me")).json()) as { themePreference: string; accentColor: string })
      .toMatchObject({ themePreference: "dark", accentColor: "purple" });

    // Neues "Geraet": frischer Browser ohne gespeicherte Werte, helles System-Schema.
    const device = await browser.newContext({ baseURL, colorScheme: "light", locale: "de-DE" });
    const other = await device.newPage();
    try {
      await other.goto("/anmelden");
      await other.getByLabel("E-Mail-Adresse").fill(user.email);
      await other.getByLabel("Passwort").fill(user.password);
      await other.getByRole("button", { name: "Anmelden" }).click();
      await expect(other).toHaveURL("/");

      await expect(other.locator("html")).toHaveClass(/dark/);
      await expect(other.locator("html")).toHaveAttribute("data-accent", "purple");
    } finally {
      await device.close();
    }
  });

  test("Navigation zeigt Gruppen und überfällige Erinnerungen", async ({ page, user }) => {
    await user.api.post("/api/reminders", {
      data: { title: "Überfällig", description: null, dueAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), reminderType: "Custom", jobApplicationId: null },
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await openNavigation(page);

    const nav = page.getByRole("navigation", { name: "Bereiche" });
    await expect(nav.getByText("Werkzeuge")).toBeVisible();
    await expect(nav.getByRole("link", { name: /Erinnerungen/ })).toContainText("1");
    await expect(nav.getByLabel("1 überfällig")).toBeVisible();
  });

  test("Benutzermenü öffnet und schließt mit Escape", async ({ page, user }) => {
    void user;
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await openNavigation(page);

    await page.getByRole("button", { name: "Benutzermenü öffnen" }).click();
    const menu = page.getByRole("menu", { name: "Benutzermenü" });
    await expect(menu.getByRole("menuitem", { name: "Darstellung" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("Vollständigkeitsanzeige verschwindet bei vollständigem Profil", async ({ page, user }) => {
    await page.goto("/einstellungen");
    await expect(page.getByText("Profil-Vollständigkeit")).toBeVisible();

    const response = await user.api.put("/api/auth/profile", {
      data: {
        firstName: "Erika",
        lastName: "Test",
        targetJobTitle: "Backend Developer",
        location: "Berlin",
        profileSummary: "Backend-Entwicklerin mit Fokus auf .NET.",
        experienceSummary: "Drei Jahre Erfahrung mit C# und PostgreSQL.",
        educationSummary: "B.Sc. Informatik",
        resumeText: "Lebenslauf von Erika Test",
        skills: ["C#", "PostgreSQL"],
        themePreference: null,
        accentColor: null,
      },
    });
    expect(response.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByLabel("Wunschposition")).toHaveValue("Backend Developer");
    await expect(page.getByText("Profil-Vollständigkeit")).toHaveCount(0);
  });
});
