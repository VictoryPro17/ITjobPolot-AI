import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures";

// Eigener Ordner, weil Playwright "test-results" zu Beginn jedes Laufs leert.
const ARTIFACT_DIR = "e2e-artifacts";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");

/**
 * Screenshots der Hauptseiten (zur manuellen Sichtpruefung, kein Pixelvergleich) und
 * ein Barrierefreiheits-Scan mit axe. Der Scan meldet nur und laesst den Test nicht scheitern.
 */
test("Hauptseiten: Screenshots und Barrierefreiheit", async ({ page, user }, testInfo) => {
  test.setTimeout(120_000);

  const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const seeded = await user.createApplications(8, (index) => ({
    companyName: ["Contoso", "Fabrikam", "Northwind", "Tailspin", "Litware", "Adventure Works", "Proseware", "Wingtip"][index - 1],
    jobTitle: ["Backend Developer", "Frontend Developer", "DevOps Engineer", "Data Engineer", "Fullstack Developer", "QA Engineer", "Cloud Architect", "Mobile Developer"][index - 1],
    status: (["Applied", "Applied", "Interview", "Offer", "Rejected", "Draft", "Accepted", "Applied"] as const)[index - 1],
    location: index % 2 === 0 ? "Berlin" : "Hamburg",
    workModel: index % 3 === 0 ? "Remote" : "Hybrid",
    technologies: ["React", "TypeScript", "C#", "Docker"].slice(0, (index % 4) + 1),
    jobDescription: "Wir suchen eine engagierte Person mit Erfahrung in modernen Webtechnologien.",
    interviewAt: index === 3 ? inFiveDays : null,
  }));
  const detailId = seeded[2].id;
  await user.api.post(`/api/job-applications/${detailId}/notes`, { data: { content: "Erstes Gespräch war sehr angenehm." } });

  const pages = [
    { name: "dashboard", url: "/" },
    { name: "bewerbungen", url: "/bewerbungen" },
    { name: "formular", url: "/bewerbungen/neu" },
    { name: "detail", url: `/bewerbungen/${detailId}` },
    { name: "detail-aktivitaet", url: `/bewerbungen/${detailId}?tab=aktivitaet` },
    { name: "board", url: "/board" },
    { name: "statistiken", url: "/statistiken" },
    { name: "erinnerungen", url: "/erinnerungen" },
    { name: "dokumente", url: "/dokumente" },
    { name: "einstellungen", url: "/einstellungen" },
  ];

  const project = testInfo.project.name;
  const report: { page: string; violations: { id: string; impact: string | null | undefined; help: string; nodes: number; targets: string[] }[] }[] = [];
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  for (const entry of pages) {
    await page.goto(entry.url);
    await page.waitForLoadState("networkidle");
    // Ladeplatzhalter (Lazy-Seiten) muessen verschwunden sein.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.getByRole("heading").first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${project}-${entry.name}.png`), fullPage: true });

    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    report.push({
      page: entry.name,
      violations: result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.length,
        targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
      })),
    });
  }

  const reportPath = path.join(ARTIFACT_DIR, `a11y-${project}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  await testInfo.attach("a11y-report", { path: reportPath, contentType: "application/json" });

  const serious = report.flatMap((entry) =>
    entry.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => `${entry.page}: ${violation.id} (${violation.nodes})`),
  );
  if (serious.length > 0) {
    testInfo.annotations.push({ type: "a11y", description: serious.join("; ") });
    console.log(`[${project}] Schwere Barrierefreiheits-Befunde:\n  ${serious.join("\n  ")}`);
  }
});
