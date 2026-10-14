import { expect, openNavigation, test } from "./fixtures";

const inThreeDays = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

test.describe("Dashboard und Statistik", () => {
  test("Dashboard zeigt Kennzahlen, Gespräche und Statusfilter-Links", async ({ page, user }) => {
    await user.createApplication({ companyName: "Eins", jobTitle: "Stelle Eins" });
    await user.createApplication({ companyName: "Zwei", jobTitle: "Stelle Zwei" });
    await user.createApplication({
      companyName: "Gesprächsfirma",
      jobTitle: "Gesprächsstelle",
      status: "Interview",
      interviewAt: inThreeDays(),
    });
    await user.createApplication({ companyName: "Vier", jobTitle: "Stelle Vier", status: "Accepted" });

    await page.goto("/");

    const tile = page
      .locator("div")
      .filter({ has: page.getByText("Bewerbungen", { exact: true }), hasText: "diesen Monat" })
      .last();
    await expect(tile.getByText("4", { exact: true })).toBeVisible();

    const upcoming = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: "Anstehende Gespräche" }), hasText: "Gesprächsstelle" })
      .last();
    await expect(upcoming.getByRole("link", { name: "Gesprächsstelle" })).toBeVisible();

    await page.getByRole("link", { name: /^Gespräch\s*1$/ }).click();
    await expect(page).toHaveURL(/\/bewerbungen\?status=Interview/);
    await expect(page.getByRole("heading", { name: "Meine Bewerbungen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gesprächsstelle" })).toBeVisible();
  });

  test("Statistikseite zeigt Diagramme und ist per Navigation erreichbar", async ({ page, user }) => {
    await user.createApplication({ companyName: "Eins", jobTitle: "Stelle Eins" });
    await user.createApplication({
      companyName: "Gesprächsfirma",
      jobTitle: "Gesprächsstelle",
      status: "Interview",
      interviewAt: inThreeDays(),
    });
    await user.createApplication({ companyName: "Vier", jobTitle: "Stelle Vier", status: "Accepted" });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Erika");
    await openNavigation(page);
    await page.getByRole("link", { name: "Statistiken" }).click();

    await expect(page).toHaveURL(/\/statistiken$/);
    await expect(page.getByRole("heading", { name: "Statistiken", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bewerbungstrichter" })).toBeVisible();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();
  });

  test("Leeres Dashboard zeigt Hinweis in der letzten Aktivität", async ({ page, user }) => {
    void user;
    await page.goto("/");

    const activity = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: "Letzte Aktivität" }), hasText: "Noch keine Bewerbungen" })
      .last();
    await expect(activity.getByText("Noch keine Bewerbungen")).toBeVisible();
  });
});
