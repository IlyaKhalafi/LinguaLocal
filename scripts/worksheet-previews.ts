import { chromium, type Browser } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { packSchema } from "../src/lib/schema";
import { createWorksheets } from "../src/lib/worksheets";
import seed from "../src/content/starter.json";
import { runCommand } from "../src/lib/cli";

export async function captureWorksheetPreviews(browser: Browser) {
  const { files } = createWorksheets(packSchema.parse(seed), "A1");
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await mkdir("docs/screenshots", { recursive: true });
    for (const file of files) {
      await page.setContent(file.html);
      for (const mobile of [false, true]) {
        await page.setViewportSize(
          mobile ? { width: 390, height: 844 } : { width: 1440, height: 1040 },
        );
        await page
          .locator(".sheet")
          .first()
          .screenshot({
            path: path.join(
              "docs/screenshots",
              `worksheet-${file.name.replace(".html", "")}${mobile ? "-mobile" : ""}.png`,
            ),
            animations: "disabled",
          });
      }
    }
  } finally {
    await context.close();
  }
}

if (require.main === module) {
  runCommand(async () => {
    const browser = await chromium.launch();
    try {
      await captureWorksheetPreviews(browser);
    } finally {
      await browser.close();
    }
  });
}
