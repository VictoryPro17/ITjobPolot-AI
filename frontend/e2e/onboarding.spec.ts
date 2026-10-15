import { deleteUser, expect, registerUser, signIn, test, type TestUser } from "./fixtures";

test.describe("Pflicht-Einstieg nach der Registrierung", () => {
  let user: TestUser;

  test.beforeEach(async ({ page, baseURL }) => {
    // Konto ohne abgeschlossenen Einstieg, im Browser angemeldet.
    user = await registerUser(baseURL!, "Nora", { onboarded: false });
    await signIn(page, user);
  });

  test.afterEach(async () => {
    await deleteUser(user);
  });

  test("Ohne Profil führt jede Seite zur Willkommensseite", async ({ page }) => {
    for (const path of ["/", "/bewerbungen", "/einstellungen"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/willkommen");
    }
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Willkommen, Nora");
  });

  test("Selbst ausfüllen: Pflichtfelder werden geprüft, danach geht es zum Dashboard", async ({ page }) => {
    await page.goto("/willkommen");
    await page.getByRole("button", { name: /Selbst ausfüllen/ }).click();

    await page.getByRole("button", { name: "Profil speichern und loslegen" }).click();
    await expect(page.getByText("Bitte gib deine Wunschposition an.")).toBeVisible();
    await expect(page.getByText("Bitte gib mindestens einen Skill an.")).toBeVisible();
    await expect(page).toHaveURL("/willkommen");

    await page.getByLabel("Wunschposition *").fill("Data Engineer");
    const skillInput = page.getByPlaceholder("z. B. C#, React, Docker");
    await skillInput.fill("Python");
    await skillInput.press("Enter");
    await page.getByRole("button", { name: "Profil speichern und loslegen" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nora");

    // Einmal abgeschlossen, fuehrt /willkommen zurueck zum Dashboard.
    await page.goto("/willkommen");
    await expect(page).toHaveURL("/");
  });

  test("Lebenslauf hochladen füllt das Profil vor", async ({ page }) => {
    test.setTimeout(120_000); // Mit lokaler KI kann das Auslesen einige Sekunden dauern.
    await page.goto("/willkommen");

    const resume = [
      "Nora Beispiel",
      "Backend Developer",
      "Berlin",
      "",
      "Berufserfahrung",
      "2022 – heute: Softwareentwicklerin bei Contoso. Entwicklung von REST-APIs mit C# und ASP.NET Core, Datenbanken mit PostgreSQL, Deployment mit Docker.",
      "",
      "Skills: C#, ASP.NET Core, PostgreSQL, Docker, Git",
    ].join("\n");
    await page.locator('input[type="file"]').setInputFiles({ name: "lebenslauf.txt", mimeType: "text/plain", buffer: Buffer.from(resume, "utf8") });

    await expect(page.getByText("Aus deinem Lebenslauf vorausgefüllt")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Docker", { exact: true })).toBeVisible();

    // Falls die Wunschposition nicht erkannt wurde, ergaenzen.
    const position = page.getByLabel("Wunschposition *");
    if (!(await position.inputValue())) {
      await position.fill("Backend Developer");
    }
    await page.getByRole("button", { name: "Profil speichern und loslegen" }).click();
    await expect(page).toHaveURL("/");
  });

  test("Auch nach erneuter Anmeldung bleibt der Einstieg Pflicht", async ({ page, browser, baseURL }) => {
    const device = await browser.newContext({ baseURL, locale: "de-DE" });
    const other = await device.newPage();
    try {
      await other.goto("/anmelden");
      await other.getByLabel("E-Mail-Adresse").fill(user.email);
      await other.getByLabel("Passwort").fill(user.password);
      await other.getByRole("button", { name: "Anmelden" }).click();
      await expect(other).toHaveURL("/willkommen");
    } finally {
      await device.close();
    }
    void page;
  });
});

test.describe("Einstieg: Fehlerbehebungen aus dem Code-Review", () => {
  let user: TestUser;

  test.beforeEach(async ({ page, baseURL }) => {
    user = await registerUser(baseURL!, "Nora", { onboarded: false });
    await signIn(page, user);
  });

  test.afterEach(async () => {
    await deleteUser(user);
  });

  test("Klick auf die Beschriftung „Skills“ löscht keinen Skill", async ({ page }) => {
    await page.goto("/willkommen");
    await page.getByRole("button", { name: /Selbst ausfüllen/ }).click();
    const input = page.getByPlaceholder("z. B. C#, React, Docker");
    await input.fill("Python");
    await input.press("Enter");
    await expect(page.getByRole("button", { name: "Python entfernen" })).toBeVisible();

    await page.getByText("Skills *", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Python entfernen" })).toBeVisible();
    await expect(input).toBeFocused();
  });

  test("„Zurück“ verwirft die Daten eines hochgeladenen Lebenslaufs", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/willkommen");
    await page.locator('input[type="file"]').setInputFiles({
      name: "falscher-lebenslauf.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Max Falsch\nKoch\nSkills: Kochen, Docker, Kubernetes", "utf8"),
    });
    await expect(page.getByText("Aus deinem Lebenslauf vorausgefüllt")).toBeVisible({ timeout: 90_000 });

    await page.getByRole("button", { name: "Zurück" }).click();
    await page.getByRole("button", { name: /Selbst ausfüllen/ }).click();

    await expect(page.getByText("Aus deinem Lebenslauf vorausgefüllt")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /entfernen$/ })).toHaveCount(0);
    await expect(page.getByLabel("Vorname")).toHaveValue("Nora");
  });
});
