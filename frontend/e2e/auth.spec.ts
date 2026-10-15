import { deleteAccount, deleteUser, expect, openNavigation, registerUser, signIn, test, TEST_PASSWORD, uniqueEmail, waitForMailLink } from "./fixtures";

test.describe("Anmeldung", () => {
  test("Registrieren, Abmelden und wieder Anmelden", async ({ page, baseURL }) => {
    const email = uniqueEmail("register");

    await page.goto("/registrieren");
    await page.getByLabel("Vorname").fill("Mira");
    await page.getByLabel("Nachname").fill("Muster");
    await page.getByLabel("E-Mail-Adresse").fill(email);
    await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Passwort wiederholen").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Registrieren" }).click();

    // Neue Konten bestaetigen zuerst ihre E-Mail-Adresse ...
    await expect(page).toHaveURL("/bestaetigung-ausstehend");
    const link = await waitForMailLink(email, "/email-bestaetigen");
    await page.goto(`${link.pathname}${link.search}`);
    await page.getByRole("link", { name: "Weiter zu JobPilot" }).click();

    // ... und richten dann im Pflicht-Einstieg ihr Profil ein.
    await expect(page).toHaveURL("/willkommen");
    await page.getByRole("button", { name: /Selbst ausfüllen/ }).click();
    await page.getByLabel("Wunschposition *").fill("Frontend Developer");
    await page.getByPlaceholder("z. B. C#, React, Docker").fill("React");
    await page.getByPlaceholder("z. B. C#, React, Docker").press("Enter");
    await page.getByRole("button", { name: "Profil speichern und loslegen" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mira");

    await openNavigation(page);
    await page.getByRole("button", { name: "Benutzermenü öffnen" }).click();
    await page.getByRole("menuitem", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/anmelden/);

    await page.getByLabel("E-Mail-Adresse").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL("/");

    await deleteAccount(baseURL!, email);
  });

  test("Falsches Passwort zeigt eine Meldung", async ({ page, baseURL }) => {
    const user = await registerUser(baseURL!);
    try {
      await page.goto("/anmelden");
      await page.getByLabel("E-Mail-Adresse").fill(user.email);
      await page.getByLabel("Passwort").fill("FalschesPasswort1");
      await page.getByRole("button", { name: "Anmelden" }).click();

      await expect(page.getByText("E-Mail-Adresse oder Passwort ist falsch.")).toBeVisible();
      await expect(page).toHaveURL(/\/anmelden/);
    } finally {
      await deleteUser(user);
    }
  });

  test("Ohne Anmeldung leitet jede Seite zur Anmeldung", async ({ page }) => {
    for (const path of ["/", "/bewerbungen", "/board", "/statistiken"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/anmelden/);
    }
  });
});


test("Nach dem Abmelden sieht eine andere Person keine Daten der vorigen Sitzung", async ({ page, baseURL }) => {
  const first = await registerUser(baseURL!, "Erste");
  const second = await registerUser(baseURL!, "Zweite");
  try {
    await first.createApplication({ companyName: "Geheim GmbH", jobTitle: "Vertrauliche Stelle" });
    await signIn(page, first);
    await page.goto("/bewerbungen");
    await expect(page.getByRole("link", { name: "Vertrauliche Stelle" }).first()).toBeVisible();

    await openNavigation(page);
    await page.getByRole("button", { name: "Benutzermenü öffnen" }).click();
    await page.getByRole("menuitem", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/anmelden/);

    // Bewerbungsabfragen der neuen Sitzung bremsen: Was in dieser Zeit sichtbar ist, kaeme aus dem Cache.
    await page.route("**/api/job-applications**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.continue();
    });

    await page.getByLabel("E-Mail-Adresse").fill(second.email);
    await page.getByLabel("Passwort").fill(second.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    // Nach der Anmeldung geht es zur zuletzt aufgerufenen Seite zurueck.
    await expect(page).toHaveURL("/bewerbungen");

    // Waehrend die Abfrage noch laeuft, duerfen keine Daten der vorigen Sitzung zu sehen sein.
    await page.waitForTimeout(500);
    await expect(page.getByText("Vertrauliche Stelle")).toHaveCount(0, { timeout: 0 });
    await expect(page.getByText("Noch keine Bewerbungen")).toBeVisible();
    await expect(page.getByText("Vertrauliche Stelle")).toHaveCount(0);
  } finally {
    await deleteUser(first);
    await deleteUser(second);
  }
});
