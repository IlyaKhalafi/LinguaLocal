import type { Browser } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { locales } from "../src/lib/locale";
import {
  studyReportHtml,
  classroomHtml,
  studyReportSchema,
} from "../src/lib/study-report";
import sample from "../examples/study-report.json";

export async function captureReportPreviews(
  browser: Browser,
  reviewFolder?: string,
) {
  const report = studyReportSchema.parse(sample);
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    for (const locale of locales) {
      const folder = locale === "en" ? "docs/screenshots" : reviewFolder;
      if (!folder) continue;
      await mkdir(folder, { recursive: true });
      for (const [name, html] of [
        ["student-summary", studyReportHtml(report, locale)],
        ["classroom-summary", classroomHtml([report], locale)],
      ]) {
        await page.setContent(html);
        for (const mobile of [false, true]) {
          await page.setViewportSize(
            mobile
              ? { width: 390, height: 844 }
              : { width: 1440, height: 1040 },
          );
          await page.screenshot({
            path: path.join(
              folder,
              `${locale === "en" ? "" : locale + "-"}${name}${mobile ? "-mobile" : ""}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }
  } finally {
    await context.close();
  }
}
