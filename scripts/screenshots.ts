import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import seed from "../src/content/starter.json";

const base = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3100";
const folder = "docs/screenshots";
const routes = [
  { name: "overview", path: "/" },
  { name: "library", path: "/library" },
  { name: "dictionary", path: "/dictionary" },
  { name: "lessons", path: "/lessons" },
  { name: "games", path: "/games" },
  { name: "quiz", path: "/games/quiz" },
  { name: "matching", path: "/games/match" },
  { name: "flashcards", path: "/flashcards" },
  { name: "progress", path: "/progress" },
  { name: "settings", path: "/settings" },
  ...seed.books.map((book) => ({
    name: `book-${book.id}`,
    path: `/library/${book.id}`,
  })),
  ...seed.lessons.map((lesson) => ({
    name: `lesson-${lesson.id}`,
    path: `/lessons/${lesson.id}`,
  })),
  { name: "not-found", path: "/not-a-page" },
];

async function main() {
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const route of routes) {
      await page.goto(base + route.path);
      await page.locator("h1:visible").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `${folder}/${route.name}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: `${folder}/${route.name}-mobile.png`,
        fullPage: true,
        animations: "disabled",
      });
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw new Error(`Horizontal overflow on ${route.path}`);
      await page.setViewportSize({ width: 1440, height: 1040 });
      console.log(`Captured ${route.path}`);
    }
    await page.goto(base + "/games/quiz");
    await page.getByRole("button", { name: "Let’s explore" }).click();
    await page.screenshot({
      path: `${folder}/quiz-playing.png`,
      fullPage: true,
    });
    await page.goto(base + "/games/match");
    await page.getByRole("button", { name: "Let’s find a match" }).click();
    await page.screenshot({
      path: `${folder}/matching-playing.png`,
      fullPage: true,
    });
    await page.goto(base + "/flashcards");
    await page.getByRole("button", { name: "Start a little practice" }).click();
    await page.screenshot({
      path: `${folder}/flashcards-playing.png`,
      fullPage: true,
    });
    await page.goto(base + "/library/everyday-english");
    await page.getByRole("button", { name: "Listening", exact: true }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.locator("audio").waitFor();
    await page.getByText("Read the transcript", { exact: true }).click();
    await page.screenshot({ path: `${folder}/listening.png`, fullPage: true });
    await writeFile(
      `${folder}/catalog.json`,
      JSON.stringify(routes, null, 2) + "\n",
    );
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await browser.close();
  }
}
void main();
