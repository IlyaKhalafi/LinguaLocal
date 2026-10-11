import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { locales, translate, type Locale } from "../src/lib/locale";
import { pageCatalogue } from "./page-catalogue";

const base = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3100";
const folder = "docs/screenshots";
const reviewFolder = process.env.SCREENSHOT_REVIEW_DIR;
const translatedPreviews = new Set([
  "overview",
  "library",
  "games",
  "settings",
]);

async function capture(page: Page, name: string, locale: Locale) {
  await page.evaluate(() => document.fonts.ready);
  for (const mobile of [false, true]) {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1040 },
    );
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error(`Horizontal overflow on ${locale} ${name}`);
    const filename = `${locale === "en" ? "" : locale + "-"}${name}${mobile ? "-mobile" : ""}.png`;
    const output =
      locale === "en" || translatedPreviews.has(name) ? folder : reviewFolder;
    if (output)
      await page.screenshot({
        path: path.join(output, filename),
        fullPage: true,
        animations: "disabled",
      });
  }
}

async function capturePractice(context: BrowserContext, locale: Locale) {
  const page = await context.newPage();
  const flows = [
    { path: "/games/quiz", button: "Start quiz", name: "quiz-playing" },
    {
      path: "/games/match",
      button: "Start matching",
      name: "matching-playing",
    },
    { path: "/flashcards", button: "Start review", name: "flashcards-playing" },
  ];
  for (const flow of flows) {
    await page.goto(base + flow.path);
    await page
      .getByRole("button", {
        name: translate(locale, flow.button),
        exact: true,
      })
      .click();
    await capture(page, flow.name, locale);
  }
  await page.goto(base + "/library/everyday-english");
  await page
    .getByRole("button", { name: translate(locale, "Listening"), exact: true })
    .click();
  await page
    .getByRole("button", { name: translate(locale, "Play"), exact: true })
    .click();
  await page.locator("audio").waitFor();
  await page
    .getByText(translate(locale, "Read the transcript"), { exact: true })
    .click();
  await capture(page, "listening", locale);
  await page.close();
}

async function main() {
  await mkdir(folder, { recursive: true });
  if (reviewFolder) await mkdir(reviewFolder, { recursive: true });
  const browser = await chromium.launch();
  const errors: string[] = [];
  try {
    for (const locale of locales) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1040 },
        deviceScaleFactor: 1,
      });
      await context.addCookies([
        { name: "lingualocal.locale", value: locale, url: base },
      ]);
      context.on("page", (page) =>
        page.on("pageerror", (error) => errors.push(error.message)),
      );
      const page = await context.newPage();
      for (const route of pageCatalogue) {
        await page.goto(base + route.path);
        await page.locator("h1:visible").waitFor();
        await capture(page, route.name, locale);
      }
      await capturePractice(context, locale);
      await context.close();
      console.log(`Captured ${locale} pages and practice`);
    }
    await writeFile(
      path.join(folder, "catalog.json"),
      JSON.stringify(pageCatalogue, null, 2) + "\n",
    );
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await browser.close();
  }
}
void main();
