import { deleteAccount, deleteUser, expect, openNavigation, registerUser, test, TEST_PASSWORD, uniqueEmail } from "./fixtures";

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

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mira");

    await openNavigation(page);
    await page.getByRole("button", { name: "Abmelden" }).click();
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

