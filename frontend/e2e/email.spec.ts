import { deleteUser, expect, registerUser, signIn, test, TEST_PASSWORD, uniqueEmail, waitForMailLink, type TestUser } from "./fixtures";

const NEW_PASSWORD = "NeuesPasswort456";

test.describe("E-Mail-Bestätigung", () => {
  let user: TestUser;

  test.beforeEach(async ({ baseURL }) => {
    user = await registerUser(baseURL!, "Nora", { confirmed: false });
  });

  test.afterEach(async () => {
    await deleteUser(user);
  });

  test("Ohne Bestätigung ist die App gesperrt; der Link aus der E-Mail schaltet sie frei", async ({ page }) => {
    await signIn(page, user);
    for (const path of ["/", "/bewerbungen", "/einstellungen", "/willkommen"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/bestaetigung-ausstehend");
    }
    await expect(page.getByRole("heading", { name: "Bitte bestätige deine E-Mail-Adresse" })).toBeVisible();

    // "Ich habe bestätigt" ohne Bestaetigung: Hinweis, Seite bleibt gesperrt.
    await page.getByRole("button", { name: "Ich habe bestätigt" }).click();
    await expect(page.getByText("Deine E-Mail-Adresse ist noch nicht bestätigt.")).toBeVisible();

    // Erneut senden verschickt eine zweite Mail.
    const before = new Date(Date.now() - 2_000);
    await page.getByRole("button", { name: "Erneut senden" }).click();
    await expect(page.getByText("Neue E-Mail verschickt.")).toBeVisible();
    const link = await waitForMailLink(user.email, "/email-bestaetigen", { after: before });

    await page.goto(`${link.pathname}${link.search}`);
    await expect(page.getByRole("heading", { name: "E-Mail-Adresse bestätigt" })).toBeVisible();
    await page.getByRole("link", { name: "Weiter zu JobPilot" }).click();

    // Nach der Bestaetigung folgt der Pflicht-Einstieg (Profil einrichten).
    await expect(page).toHaveURL("/willkommen");
  });

  test("Bestätigung in einem anderen Browser: \"Ich habe bestätigt\" schaltet frei", async ({ page }) => {
    await signIn(page, user);
    await page.goto("/");
    await expect(page).toHaveURL("/bestaetigung-ausstehend");

    // Link anderswo oeffnen (hier direkt per API, ohne Sitzung).
    const link = await waitForMailLink(user.email, "/email-bestaetigen");
    const response = await fetch(new URL("/api/auth/confirm-email", page.url()), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: link.searchParams.get("userId"), token: link.searchParams.get("token") }),
    });
    expect(response.status).toBe(204);

    await page.getByRole("button", { name: "Ich habe bestätigt" }).click();
    await expect(page).toHaveURL("/willkommen");
  });

  test("Manipulierter Bestätigungslink zeigt einen Fehler", async ({ page }) => {
    const link = await waitForMailLink(user.email, "/email-bestaetigen");
    await page.goto(`/email-bestaetigen?userId=${link.searchParams.get("userId")}&token=ungueltig`);
    await expect(page.getByText(/ungültig oder abgelaufen/)).toBeVisible();
  });
});

test.describe("Passwort vergessen", () => {
  let user: TestUser;

  test.beforeEach(async ({ baseURL }) => {
    user = await registerUser(baseURL!, "Nora");
  });

  test.afterEach(async () => {
    await deleteUser(user);
  });

  test("Link per E-Mail, neues Passwort setzen, danach mit neuem Passwort anmelden", async ({ page }) => {
    const before = new Date();
    await page.goto("/anmelden");
    await page.getByRole("link", { name: "Passwort vergessen?" }).click();
    await expect(page).toHaveURL("/passwort-vergessen");

    await page.getByLabel("E-Mail-Adresse").fill(user.email);
    await page.getByRole("button", { name: "Link senden" }).click();
    await expect(page.getByText(/Falls ein Konto zu dieser Adresse existiert/)).toBeVisible();

    const link = await waitForMailLink(user.email, "/passwort-zuruecksetzen", { after: before });
    await page.goto(`${link.pathname}${link.search}`);
    await page.getByLabel("Neues Passwort", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Neues Passwort wiederholen").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByText("Dein Passwort wurde geändert.")).toBeVisible();

    // Derselbe Link funktioniert kein zweites Mal.
    await page.goto(`${link.pathname}${link.search}`);
    await page.getByLabel("Neues Passwort", { exact: true }).fill("NochEinNeues789");
    await page.getByLabel("Neues Passwort wiederholen").fill("NochEinNeues789");
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByText(/ungültig oder abgelaufen/)).toBeVisible();

    // Altes Passwort gilt nicht mehr, das neue schon.
    await page.goto("/anmelden");
    await page.getByLabel("E-Mail-Adresse").fill(user.email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page.getByText("E-Mail-Adresse oder Passwort ist falsch.")).toBeVisible();

    await page.getByLabel("Passwort").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL("/");
    user.password = NEW_PASSWORD;
  });

  test("Unbekannte Adresse bekommt dieselbe Antwort", async ({ page }) => {
    await page.goto("/passwort-vergessen");
    await page.getByLabel("E-Mail-Adresse").fill(uniqueEmail("niemand"));
    await page.getByRole("button", { name: "Link senden" }).click();
    await expect(page.getByText(/Falls ein Konto zu dieser Adresse existiert/)).toBeVisible();
  });

  test("Link ohne Token zeigt einen Hinweis", async ({ page }) => {
    await page.goto("/passwort-zuruecksetzen");
    await expect(page.getByRole("link", { name: /Neuen Link anfordern|Passwort vergessen/ }).first()).toBeVisible();
  });
});

test("Anmeldeseite in Du-Form mit Link zu Passwort vergessen", async ({ page }) => {
  await page.goto("/anmelden");
  await expect(page.getByRole("heading", { name: "Willkommen zurück" })).toBeVisible();
  await expect(page.getByText("Melde dich an")).toBeVisible();
  await expect(page.getByText(/Sie |Ihre /)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Passwort vergessen?" })).toBeVisible();
});
