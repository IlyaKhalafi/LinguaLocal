import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { locales } from "../src/lib/locale";

const base = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3100";
const folder =
  process.env.SCREENSHOT_REVIEW_DIR || "artifacts/language-previews";
async function main() {
  const captures = [];

  await mkdir(folder, { recursive: true });

  for (const [name, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ] as const) {
    const browser = await engine.launch();
    try {
      for (const locale of locales) {
        for (const mobile of [false, true]) {
          for (const appearance of ["light", "dark"] as const) {
            const viewport = mobile
              ? { width: 390, height: 844 }
              : { width: 1440, height: 1040 };
            const context = await browser.newContext({
              viewport,
              deviceScaleFactor: 2,
              colorScheme: appearance,
              reducedMotion: "reduce",
            });
            try {
              await context.addCookies([
                { name: "lingualocal.locale", value: locale, url: base },
                {
                  name: "lingualocal.preferences",
                  value: encodeURIComponent(JSON.stringify({ appearance })),
                  url: base,
                },
              ]);
              const page = await context.newPage();
              await page.goto(base + "/settings");
              await page.locator("h1").waitFor();
              await page.evaluate(() => document.fonts.ready);
              await page.waitForFunction(
                () =>
                  document.querySelectorAll(".language-control").length === 1,
              );
              const dimensions = await page
                .locator(".language-control")
                .evaluate((control) => {
                  const select = control.querySelector("select")!;
                  const icon = control.querySelector("svg")!;
                  const value = control.querySelector(".language-value")!;
                  const controlRect = control.getBoundingClientRect();
                  const iconRect = icon.getBoundingClientRect();
                  const valueRect = value.getBoundingClientRect();
                  const rtl = getComputedStyle(control).direction === "rtl";
                  return {
                    locale: document.documentElement.lang,
                    appearance: document.documentElement.dataset.appearance,
                    arrowInset: rtl
                      ? iconRect.left - controlRect.left
                      : controlRect.right - iconRect.right,
                    labelGap: rtl
                      ? valueRect.left - iconRect.right
                      : iconRect.left - valueRect.right,
                    controlHeight: controlRect.height,
                    inputFontSize: parseFloat(
                      getComputedStyle(select).fontSize,
                    ),
                    overflow: document.documentElement.scrollWidth > innerWidth,
                  };
                });
              if (
                dimensions.locale !== locale ||
                dimensions.appearance !== appearance ||
                dimensions.arrowInset < 15 ||
                dimensions.arrowInset > 18 ||
                dimensions.labelGap < 11 ||
                dimensions.labelGap > 13 ||
                dimensions.controlHeight < (mobile ? 44 : 40) ||
                dimensions.inputFontSize < 16 ||
                dimensions.overflow
              ) {
                throw new Error(
                  `Language control dimensions failed for ${name} ${locale} ${appearance} ${JSON.stringify(dimensions)}`,
                );
              }
              const suffix = `${locale}-${name}-${mobile ? "mobile" : "desktop"}-${appearance}`;
              const fullPage = `selector-page-${suffix}.png`;
              const closeUp = `language-selector-${suffix}.png`;
              await page.screenshot({
                path: path.join(folder, fullPage),
                fullPage: true,
                scale: "css",
                animations: "disabled",
              });
              const rectangle = await page
                .locator(".language-select")
                .boundingBox();
              if (!rectangle)
                throw new Error("Language control is not visible");
              await page.screenshot({
                path: path.join(folder, closeUp),
                clip: {
                  x: rectangle.x - 10,
                  y: rectangle.y - 10,
                  width: rectangle.width + 20,
                  height: rectangle.height + 20,
                },
                animations: "disabled",
              });
              captures.push({
                engine: name,
                locale,
                mobile,
                appearance,
                viewport,
                dimensions,
                fullPage,
                closeUp,
              });
              console.log(`Captured ${suffix}`);
            } finally {
              await context.close();
            }
          }
        }
      }
    } finally {
      await browser.close();
    }
  }

  await writeFile(
    path.join(folder, "language-catalog.json"),
    JSON.stringify(captures, null, 2) + "\n",
  );
  console.log(`Captured ${captures.length * 2} language previews`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
