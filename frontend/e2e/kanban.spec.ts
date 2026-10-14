import { expect, test } from "./fixtures";

test.describe("Kanban-Board", () => {
  test("Spalte lädt Karten seitenweise nach", async ({ page, user }) => {
    await user.createApplications(20, (i) => ({ companyName: `Firma ${i}`, jobTitle: `Entwickler ${i}` }));

    await page.goto("/board");
    const column = page.getByRole("region", { name: "Beworben, 20 Bewerbungen" });
    await expect(column).toBeVisible();
    await expect(column.getByRole("article")).toHaveCount(15);

    const more = column.getByRole("button", { name: "Weitere 5 laden (noch 5)" });
    await expect(more).toBeVisible();
    await more.click();

    await expect(column.getByRole("article")).toHaveCount(20);
    await expect(more).toBeHidden();
  });

  test("Status über das Auswahlfeld der Karte ändern", async ({ page, user }) => {
    await user.createApplication({ companyName: "Wechsel GmbH", jobTitle: "Statuswechsel" });

    await page.goto("/board");
    await expect(page.getByRole("region", { name: "Beworben, 1 Bewerbungen" })).toBeVisible();

    await page.getByLabel("Status von Statuswechsel ändern").selectOption({ label: "Gespräch" });

    const interview = page.getByRole("region", { name: "Gespräch, 1 Bewerbungen" });
    await expect(interview.getByRole("link", { name: "Statuswechsel" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Beworben, 0 Bewerbungen" })).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Gespräch, 1 Bewerbungen" }).getByRole("link", { name: "Statuswechsel" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Beworben, 0 Bewerbungen" })).toBeVisible();
  });

  test("Karte per Drag and Drop verschieben", async ({ page, user, isMobile }) => {
    test.skip(isMobile, "Drag and Drop gibt es nur mit Maus");
    await user.createApplication({ companyName: "Drag GmbH", jobTitle: "Ziehbare Stelle" });

    await page.goto("/board");
    const card = page.getByRole("region", { name: "Beworben, 1 Bewerbungen" }).getByRole("article");
    await expect(card).toBeVisible();

    // dragTo loest in Chromium die HTML5-Drag-Ereignisse nicht zuverlaessig aus; daher mit gemeinsamem DataTransfer (die Karte verschwindet nach dem Drop, dragend entfaellt).
    const target = page.getByRole("region", { name: "Angebot, 0 Bewerbungen" });
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await card.dispatchEvent("dragstart", { dataTransfer });
    await target.dispatchEvent("dragover", { dataTransfer });
    await target.dispatchEvent("drop", { dataTransfer });

    const offer = page.getByRole("region", { name: "Angebot, 1 Bewerbungen" });
    await expect(offer.getByRole("link", { name: "Ziehbare Stelle" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Beworben, 0 Bewerbungen" })).toBeVisible();
  });

  test("Kartengröße und eingeklappte Spalten bleiben erhalten", async ({ page, user }) => {
    await user.createApplication({ companyName: "Prefs GmbH", jobTitle: "Einstellungen" });

    await page.goto("/board");
    await page.getByRole("radio", { name: "Detail" }).click();
    await expect(page.getByRole("radio", { name: "Detail" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Spalte Entwurf einklappen" }).click();
    await expect(page.getByRole("button", { name: /^Spalte Entwurf ausklappen/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("radio", { name: "Detail" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Kompakt" })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("button", { name: /^Spalte Entwurf ausklappen/ })).toBeVisible();
  });

  test("Suche filtert die Karten auf dem Board", async ({ page, user }) => {
    await user.createApplication({ companyName: "Alpha GmbH", jobTitle: "Stelle Alpha" });
    await user.createApplication({ companyName: "Beta AG", jobTitle: "Stelle Beta" });

    await page.goto("/board");
    await expect(page.getByRole("link", { name: "Stelle Alpha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Stelle Beta" })).toBeVisible();

    await page.getByLabel("Board durchsuchen").fill("Alpha");
    await expect(page.getByRole("link", { name: "Stelle Alpha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Stelle Beta" })).toBeHidden();
  });
});
