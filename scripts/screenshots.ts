import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { locales, translate, type Locale } from "../src/lib/locale";
import { pageCatalogue } from "./page-catalogue";
import seed from "../src/content/starter.json";
import { parseSubtitles, plainSubtitle } from "../src/lib/subtitles";
import { captureWorksheetPreviews } from "./worksheet-previews";

const base = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3100";
const folder = "docs/screenshots";
const reviewFolder = process.env.SCREENSHOT_REVIEW_DIR;
const translatedPreviews = new Set([
  "overview",
  "library",
  "games",
  "settings",
  "join-network",
  "reading-settings",
  "dark-settings",
  "dark-overview",
]);

async function capture(page: Page, name: string, locale: Locale) {
  await page.evaluate(() => document.fonts.ready);
  for (const mobile of [false, true]) {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1040 },
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
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
    {
      path: "/games/practice",
      button: "Start practice",
      name: "practice-playing",
    },
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
    if (flow.name === "practice-playing") {
      await page
        .getByLabel(translate(locale, "Your answer"))
        .fill("not-a-word");
      await page
        .getByRole("button", {
          name: translate(locale, "Check answer"),
          exact: true,
        })
        .click();
      await capture(page, "practice-correction", locale);
    } else if (flow.name === "quiz-playing") {
      const headword = await page.locator(".quiz-word").innerText();
      const word = seed.words.find((item) => item.word === headword)!;
      await page
        .getByRole("button", { name: word.definition, exact: false })
        .click();
      await page
        .getByRole("button", {
          name: translate(locale, "Check meaning"),
          exact: true,
        })
        .click();
      await capture(page, "quiz-feedback", locale);
    }
  }
  const lesson = seed.lessons.find((item) => item.id === "present-simple")!;
  await page.goto(base + `/lessons/${lesson.id}`);
  await page.locator(".option").nth(lesson.answer).click();
  await page
    .getByRole("button", {
      name: translate(locale, "Check answer"),
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: translate(locale, "Mark as complete"),
      exact: true,
    })
    .click();
  await capture(page, "lesson-completed", locale);
  await page
    .getByRole("link", {
      name: translate(locale, "Review lesson words"),
      exact: true,
    })
    .click();
  await capture(page, "lesson-review", locale);
  await page.locator(".flashcard").click();
  await capture(page, "lesson-review-flipped", locale);
  for (let index = 0; index < lesson.wordIds.length; index++) {
    if (index) await page.locator(".flashcard").click();
    await page
      .getByRole("button", {
        name: translate(locale, "I remembered"),
        exact: true,
      })
      .click();
  }
  await capture(page, "lesson-review-complete", locale);
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
  await page
    .getByRole("button", { name: translate(locale, "Watching"), exact: true })
    .click();
  await page
    .getByRole("button", { name: translate(locale, "Play"), exact: true })
    .click();
  await page
    .getByText(translate(locale, "Read the transcript"), { exact: true })
    .click();
  await page.locator(".transcript-cues li").first().waitFor();
  await page.locator("video").evaluate((video: HTMLVideoElement) => {
    video.pause();
    video.currentTime = 4;
  });
  await capture(page, "timed-transcript", locale);
  await page
    .getByRole("button", {
      name: translate(locale, "Practise listening"),
      exact: true,
    })
    .click();
  await page.locator("video").evaluate((video: HTMLVideoElement) => {
    video.pause();
    video.currentTime = 0;
  });
  await capture(page, "dictation", locale);
  await page
    .getByLabel(translate(locale, "Type what you hear"))
    .fill("Hello. A conversation starts here.");
  await page
    .getByRole("button", {
      name: translate(locale, "Check answer"),
      exact: true,
    })
    .click();
  await capture(page, "dictation-correction", locale);
  await page.evaluate(() => {
    document.documentElement.dataset.appearance = "dark";
  });
  await capture(page, "dictation-dark", locale);
  await page.evaluate(() => {
    document.documentElement.dataset.appearance = "light";
  });
  const passages = parseSubtitles(
    await readFile("public/demo/greetings.vtt", "utf8"),
  ).cues;
  for (const cue of passages.slice(1)) {
    await page
      .getByRole("button", {
        name: translate(locale, "Next passage"),
        exact: true,
      })
      .click();
    await page
      .getByLabel(translate(locale, "Type what you hear"))
      .fill(plainSubtitle(cue.text));
    await page
      .getByRole("button", {
        name: translate(locale, "Check answer"),
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("button", {
      name: translate(locale, "View result"),
      exact: true,
    })
    .click();
  await capture(page, "dictation-complete", locale);
  await page.route("**/api/network", (route) =>
    route.fulfill({ json: { addresses: ["http://192.168.1.20:3000"] } }),
  );
  await page.goto(base + "/settings");
  await page
    .getByRole("button", {
      name: translate(locale, "Show network address"),
      exact: true,
    })
    .click();
  await page
    .getByRole("img", { name: translate(locale, "Scan to open LinguaLocal") })
    .waitFor();
  await capture(page, "join-network", locale);
  await page
    .getByRole("button", {
      name: translate(locale, "Hide network address"),
      exact: true,
    })
    .click();
  await page
    .getByText(translate(locale, "Reading preferences"), { exact: true })
    .click();
  await page
    .getByLabel(translate(locale, "Reading size"))
    .selectOption("large");
  await page
    .getByLabel(translate(locale, "Line spacing"))
    .selectOption("relaxed");
  await page
    .getByLabel(translate(locale, "Reading font"))
    .selectOption("readable");
  await page
    .getByLabel(translate(locale, "High contrast"), { exact: true })
    .check();
  await page
    .getByLabel(translate(locale, "Quiet mode"), { exact: true })
    .check();
  await capture(page, "reading-settings", locale);
  await page
    .getByLabel(translate(locale, "Reading size"))
    .selectOption("standard");
  await page
    .getByLabel(translate(locale, "Line spacing"))
    .selectOption("standard");
  await page
    .getByLabel(translate(locale, "Reading font"))
    .selectOption("default");
  await page
    .getByLabel(translate(locale, "High contrast"), { exact: true })
    .uncheck();
  await page
    .getByLabel(translate(locale, "Quiet mode"), { exact: true })
    .uncheck();
  await page
    .getByLabel(translate(locale, "Appearance"), { exact: true })
    .selectOption("dark");
  await capture(page, "dark-settings", locale);
  await page.goto(base + "/");
  await capture(page, "dark-overview", locale);
  await page.close();
}

async function capturePersonalNotes(context: BrowserContext, locale: Locale) {
  const page = await context.newPage();
  for (const [route, name, text] of [
    ["/dictionary?search=curious", "word-note", "Keep asking why."],
    ["/lessons/present-simple", "lesson-note", "I practise every morning."],
  ]) {
    await page.goto(base + route);
    const note = page.locator(".personal-note").first();
    await note.locator("summary").click();
    await note
      .getByRole("textbox", { name: translate(locale, "My note") })
      .fill(text);
    await note
      .getByRole("button", {
        name: translate(locale, "Save note"),
        exact: true,
      })
      .click();
    await capture(page, name, locale);
  }
  await page.goto(base + "/dictionary?search=curious");
  await page.locator(".personal-note > summary").first().click();
  await page
    .locator("html")
    .evaluate((html) => html.setAttribute("data-appearance", "dark"));
  await capture(page, "dark-word-note", locale);
  await page.close();
}

async function captureStudyDecks(context: BrowserContext, locale: Locale) {
  const page = await context.newPage();
  await page.goto(base + "/flashcards");
  await page.locator(".deck-manager > summary").click();
  await page.getByLabel(translate(locale, "Deck name")).fill("Travel");
  await page
    .getByLabel(translate(locale, "Tags, separated by commas"))
    .fill("school, travel");
  await page
    .getByRole("button", { name: translate(locale, "Save deck"), exact: true })
    .click();
  await capture(page, "deck-manager", locale);
  for (const word of ["curious", "journey"]) {
    await page.goto(base + `/dictionary?search=${word}`);
    await page.locator(".word-decks > summary").first().click();
    await page.getByRole("checkbox", { name: "Travel", exact: true }).check();
    if (word === "curious") await capture(page, "word-decks", locale);
  }
  await page.goto(base + "/flashcards");
  await capture(page, "study-decks", locale);
  await page
    .getByRole("button", {
      name: translate(locale, "Start review"),
      exact: true,
    })
    .click();
  await page.locator(".flashcard").click();
  await page.locator(".review-ratings > summary").click();
  await capture(page, "review-ratings", locale);
  await page.close();
}

async function main() {
  await mkdir(folder, { recursive: true });
  if (reviewFolder) await mkdir(reviewFolder, { recursive: true });
  const browser = await chromium.launch();
  const errors: string[] = [];
  try {
    await captureWorksheetPreviews(browser);
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
        if (
          (await page.locator("h1:visible").innerText()) !==
          translate(locale, route.heading)
        )
          throw new Error(`Unexpected page at ${route.path}`);
        await capture(page, route.name, locale);
      }
      await capturePersonalNotes(context, locale);
      await capturePractice(context, locale);
      await captureStudyDecks(context, locale);
      await page.goto(
        base +
          `/assignment?plan=${encodeURIComponent(JSON.stringify({ version: 1, title: "A little everyday English", tasks: [{ kind: "word", id: "curious" }] }))}`,
      );
      await page
        .getByRole("checkbox", {
          name: translate(locale, "Complete {title}", { title: "curious" }),
          exact: true,
        })
        .check();
      await page.goto(base + "/progress");
      await page.locator(".assignment-history > summary").click();
      await capture(page, "assignment-history", locale);
      await context.close();
      console.log(`Captured ${locale} pages and practice`);
    }
    await writeFile(
      path.join(folder, "catalog.json"),
      JSON.stringify(pageCatalogue, null, 2) + "\n",
    );
    const featuresPath = "docs/FEATURES.md";
    const table = [
      "| Page | Route | Desktop | Mobile |",
      "| --- | --- | --- | --- |",
      ...pageCatalogue.map(
        (route) =>
          `| ${route.label ?? route.heading} | \`${route.displayPath ?? route.path}\` | [View](screenshots/${route.name}.png) | [View](screenshots/${route.name}-mobile.png) |`,
      ),
    ].join("\n");
    const features = await readFile(featuresPath, "utf8");
    await writeFile(
      featuresPath,
      features.replace(
        /\| Page\s+\|[\s\S]*?(?=\n## A little practice)/,
        table + "\n",
      ),
    );
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await browser.close();
  }
}
void main();
