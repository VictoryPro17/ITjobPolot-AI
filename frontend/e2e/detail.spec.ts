import { expect, test } from "./fixtures";

test.describe("Detailseite", () => {
  test("Tabs wechseln und stehen in der URL", async ({ page, user }) => {
    const application = await user.createApplication({
      companyName: "Contoso",
      jobTitle: "Backend Developer",
      jobDescription: "Wir suchen Erfahrung mit C# und PostgreSQL.",
      technologies: ["C#", "PostgreSQL"],
    });

    await page.goto(`/bewerbungen/${application.id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Backend Developer" })).toBeVisible();
    await expect(page.getByText("Wir suchen Erfahrung mit C# und PostgreSQL.")).toBeVisible();

    await page.getByRole("tab", { name: "Aktivität" }).click();
    await expect(page).toHaveURL(/\?tab=aktivitaet$/);
    await expect(page.getByLabel("Neue Notiz")).toBeVisible();

    await page.getByRole("tab", { name: "Dokumente" }).click();
    await expect(page).toHaveURL(/\?tab=dokumente$/);
    await expect(page.getByText("Noch keine Dokumente")).toBeVisible();

    await page.getByRole("tab", { name: "KI" }).click();
    await expect(page).toHaveURL(/\?tab=ki$/);
    await expect(page.getByRole("button", { name: "Jetzt analysieren" })).toBeVisible();

    // Direkter Aufruf mit Tab-Parameter oeffnet den Tab.
    await page.goto(`/bewerbungen/${application.id}?tab=aktivitaet`);
    await expect(page.getByRole("tab", { name: "Aktivität" })).toHaveAttribute("aria-selected", "true");
  });

  test("Notiz anlegen und loeschen", async ({ page, user }) => {
    const application = await user.createApplication({ companyName: "Contoso", jobTitle: "Frontend Developer" });

    await page.goto(`/bewerbungen/${application.id}?tab=aktivitaet`);
    const note = "Telefonat mit Frau Meier – Rückmeldung bis Freitag";
    await page.getByLabel("Neue Notiz").fill(note);
    await page.getByLabel("Neue Notiz").press("Control+Enter");

    const timeline = page.getByRole("list").filter({ hasText: note });
    await expect(timeline.getByText(note)).toBeVisible();
    await expect(page.getByLabel("Neue Notiz")).toHaveValue("");

    // Nach dem Neuladen ist die Notiz weiterhin da (serverseitig gespeichert).
    await page.reload();
    await expect(page.getByText(note)).toBeVisible();

    await page.getByRole("button", { name: "Notiz löschen" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Löschen" }).click();
    await expect(page.getByText(note)).toHaveCount(0);
  });

  test("Statuswechsel mit Kommentar erscheint im Verlauf", async ({ page, user }) => {
    const application = await user.createApplication({ companyName: "Contoso", jobTitle: "DevOps Engineer" });

    await page.goto(`/bewerbungen/${application.id}`);
    await page.getByRole("button", { name: "Status ändern" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Neuer Status").selectOption({ label: "Gespräch" });
    await dialog.getByLabel("Kommentar (optional)").fill("Einladung per Mail");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole("main").getByText("Gespräch").first()).toBeVisible();

    await page.getByRole("tab", { name: "Aktivität" }).click();
    await expect(page.getByText("„Einladung per Mail“")).toBeVisible();
  });

  test("Nachfass-Erinnerung mit einem Klick", async ({ page, user }) => {
    const application = await user.createApplication({ companyName: "Fabrikam", jobTitle: "Data Engineer" });

    await page.goto(`/bewerbungen/${application.id}`);
    await expect(page.getByText("Keine offenen Erinnerungen.")).toBeVisible();

    await page.getByRole("button", { name: "Nachfassen in 7 Tagen" }).click();
    await expect(page.getByText("Nachfassen: Fabrikam")).toBeVisible();

    await page.getByRole("button", { name: "„Nachfassen: Fabrikam“ als erledigt markieren" }).click();
    await expect(page.getByText("Keine offenen Erinnerungen.")).toBeVisible();
  });

  test("Unbekannte Bewerbung zeigt einen Hinweis", async ({ page, user }) => {
    void user;
    await page.goto("/bewerbungen/00000000-0000-7000-8000-000000000000");
    await expect(page.getByText("Bewerbung nicht gefunden")).toBeVisible();
  });
});
