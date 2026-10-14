import { expect, test } from "./fixtures";

test.describe("Bewerbungen", () => {
  test("Formular zeigt Pflichtfeld-Fehler und bleibt auf der Seite", async ({ page, user }) => {
    void user;
    await page.goto("/bewerbungen/neu");
    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page.getByText("Bitte gib den Firmennamen ein.")).toBeVisible();
    await expect(page.getByText("Bitte gib den Jobtitel ein.")).toBeVisible();
    await expect(page).toHaveURL(/\/bewerbungen\/neu$/);
  });

  test("Neue Bewerbung anlegen", async ({ page, user }) => {
    void user;
    await page.goto("/bewerbungen/neu");
    await page.getByLabel("Firma *").fill("Testfirma GmbH");
    await page.getByLabel("Jobtitel *").fill("Senior Frontend Entwickler");

    await page.getByLabel(/^Status/).selectOption({ label: "Beworben" });
    await expect(page.getByLabel(/^Bewerbungsdatum/)).not.toHaveValue("");

    await page.getByPlaceholder("z. B. React, C#, Docker").fill("React");
    await page.getByPlaceholder("z. B. React, C#, Docker").press("Enter");
    await expect(page.getByRole("button", { name: "React entfernen" })).toBeVisible();

    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page).toHaveURL(/\/bewerbungen\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Senior Frontend Entwickler" }).first()).toBeVisible();
  });

  test("Suche und Statusfilter in der Liste", async ({ page, user }) => {
    await user.createApplication({ companyName: "Alpha GmbH", jobTitle: "Entwickler Alpha", status: "Applied" });
    await user.createApplication({ companyName: "Beta AG", jobTitle: "Entwickler Beta", status: "Interview" });
    await user.createApplication({ companyName: "Gamma KG", jobTitle: "Entwickler Gamma", status: "Rejected" });

    const alpha = page.getByRole("link", { name: "Entwickler Alpha" });
    const beta = page.getByRole("link", { name: "Entwickler Beta" });
    const gamma = page.getByRole("link", { name: "Entwickler Gamma" });

    await page.goto("/bewerbungen");
    await expect(alpha).toBeVisible();
    await expect(beta).toBeVisible();
    await expect(gamma).toBeVisible();

    const search = page.getByLabel("Bewerbungen durchsuchen");
    await search.fill("Beta");
    await expect(beta).toBeVisible();
    await expect(alpha).toBeHidden();
    await expect(gamma).toBeHidden();

    await search.clear();
    await expect(alpha).toBeVisible();
    await expect(gamma).toBeVisible();

    await page.getByRole("button", { name: /^Gespräch/ }).click();
    await expect(page).toHaveURL(/\?status=Interview/);
    await expect(beta).toBeVisible();
    await expect(alpha).toBeHidden();
    await expect(gamma).toBeHidden();

    await page.goto("/bewerbungen?status=Rejected");
    await expect(gamma).toBeVisible();
    await expect(alpha).toBeHidden();
    await expect(beta).toBeHidden();
    await expect(page.getByRole("button", { name: /^Absage/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("Bewerbung löschen", async ({ page, user }) => {
    await user.createApplication({ companyName: "Löschfirma", jobTitle: "Zu löschende Stelle" });

    await page.goto("/bewerbungen");
    await expect(page.getByRole("link", { name: "Zu löschende Stelle" })).toBeVisible();

    await page.getByRole("button", { name: "Löschen" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Löschen" }).click();

    await expect(page.getByRole("link", { name: "Zu löschende Stelle" })).toBeHidden();
    await expect(page.getByText("Noch keine Bewerbungen")).toBeVisible();
  });
});
