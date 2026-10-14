import { expect, test, TEST_PASSWORD } from "./fixtures";

test.describe("Einstellungen", () => {
  test("Bereiche wechseln und stehen in der URL", async ({ page, user }) => {
    void user;
    await page.goto("/einstellungen");
    const nav = page.getByRole("navigation", { name: "Einstellungsbereiche" });
    await expect(nav.getByRole("button", { name: "Profil" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("button", { name: "Sicherheit" }).click();
    await expect(page).toHaveURL(/\?bereich=sicherheit$/);
    await expect(page.getByRole("heading", { name: "Sicherheit" })).toBeVisible();

    await page.goto("/einstellungen?bereich=daten");
    await expect(page.getByRole("heading", { name: "Deine Daten herunterladen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Konto löschen" })).toBeVisible();
  });

  test("Profil speichern und ungespeicherte Eingaben bleiben beim Bereichswechsel erhalten", async ({ page, user }) => {
    void user;
    await page.goto("/einstellungen");
    await page.getByLabel("Wunschposition").fill("Junior Backend Developer");
    await expect(page.getByText("Ungespeicherte Änderungen")).toBeVisible();

    // Wechsel in einen anderen Bereich: Hinweis erscheint, Eingabe bleibt erhalten.
    const nav = page.getByRole("navigation", { name: "Einstellungsbereiche" });
    await nav.getByRole("button", { name: "Darstellung" }).click();
    await expect(page.getByText("Ungespeicherte Profiländerungen")).toBeVisible();
    await page.getByRole("button", { name: "Zurück zum Profil" }).click();
    await expect(page.getByLabel("Wunschposition")).toHaveValue("Junior Backend Developer");

    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.getByText("Profil wurde gespeichert.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Wunschposition")).toHaveValue("Junior Backend Developer");
  });

  test("Fehlende Angabe springt zum Feld", async ({ page, user }) => {
    void user;
    await page.goto("/einstellungen");
    await page.getByRole("button", { name: "+ Berufserfahrung" }).click();
    await expect(page).toHaveURL(/\?bereich=lebenslauf$/);
    await expect(page.getByLabel("Berufserfahrung")).toBeFocused();
  });

  test("Passwort-Checkliste und Passwort ändern", async ({ page, user }) => {
    await page.goto("/einstellungen?bereich=sicherheit");
    const submit = page.getByRole("button", { name: "Passwort ändern" });
    await expect(submit).toBeDisabled();

    await page.getByLabel("Aktuelles Passwort").fill(user.password);
    await page.getByLabel("Neues Passwort", { exact: true }).fill("kurz");
    const rules = page.getByRole("list", { name: "Passwortregeln" });
    await expect(rules.getByText("Mindestens 10 Zeichen")).toContainText("(nicht erfüllt)");

    const newPassword = `${TEST_PASSWORD}X`;
    await page.getByLabel("Neues Passwort", { exact: true }).fill(newPassword);
    await page.getByLabel("Neues Passwort bestätigen").fill(newPassword);
    await expect(rules.getByText("Beide Eingaben stimmen überein")).toContainText("(erfüllt)");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page.getByText("Dein Passwort wurde geändert.")).toBeVisible();

    // Damit das Fixture das Konto am Ende loeschen kann.
    user.password = newPassword;
  });

  test("Modus wird sofort angewendet und gespeichert", async ({ page, user }) => {
    void user;
    await page.goto("/einstellungen?bereich=darstellung");
    const scheme = page.getByRole("radiogroup", { name: "Modus" });

    await scheme.getByRole("radio", { name: /Dunkel/ }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(scheme.getByRole("radio", { name: /Dunkel/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await scheme.getByRole("radio", { name: /Hell/ }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
