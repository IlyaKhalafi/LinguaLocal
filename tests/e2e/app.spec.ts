import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import seed from "../../src/content/starter.json";

const routes = [
  "/",
  "/library",
  "/dictionary",
  "/lessons",
  "/games",
  "/games/quiz",
  "/games/match",
  "/flashcards",
  "/progress",
  "/settings",
  "/studio",
  ...seed.books.map((book) => `/library/${book.id}`),
  ...seed.lessons.map((lesson) => `/lessons/${lesson.id}`),
  "/not-a-page",
];

for (const route of routes) {
  test(`page works on desktop and mobile ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator("h1:visible")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("h1:visible")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close navigation", exact: true })
      .last()
      .click();
    const mobileResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      mobileResults.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("dictionary search, saved words, and flashcard reviews survive a reload", async ({
  page,
}) => {
  await page.goto("/dictionary");
  await page
    .getByRole("textbox", { name: "Search dictionary" })
    .fill("curious");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Save curious", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unsave curious" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Saved words", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.goto("/flashcards");
  await page.getByRole("button", { name: "My saved words" }).click();
  await page.getByRole("button", { name: "Start a little practice" }).click();
  await page.getByRole("button", { name: "Reveal meaning of curious" }).click();
  await page.getByRole("button", { name: "I remembered" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A little practice, a little progress.",
    }),
  ).toBeVisible();
  await page.reload();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(progress.reviews.curious.repetitions).toBe(1);
  expect(Object.values(progress.activity)).toEqual([1]);
});

test("library search and playable audio support seeking and downloads", async ({
  page,
  request,
}) => {
  await page.goto("/library");
  await page
    .getByRole("textbox", { name: "Search books" })
    .fill("Everyday English");
  await expect(page.locator(".book-card")).toHaveCount(1);
  await page.locator(".book-card").click();
  await page.getByRole("button", { name: "Listening", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator("audio")).toBeVisible();
  await page.waitForFunction(
    () => (document.querySelector("audio")?.duration ?? 0) > 0,
  );
  await page.evaluate(async () => {
    const audio = document.querySelector("audio")!;
    await audio.play();
    audio.currentTime = 10;
  });
  await page.waitForFunction(
    () => (document.querySelector("audio")?.currentTime ?? 0) >= 10,
  );
  await page.getByText("Read the transcript", { exact: true }).click();
  await expect(page.locator("details p")).toContainText(
    "Welcome to your English class",
  );
  const range = await request.get("/api/media/sample-dialogue.wav", {
    headers: { Range: "bytes=0-99" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(100);
  expect(range.headers()["content-range"]).toMatch(/^bytes 0-99\//);
  const suffix = await request.get("/api/media/sample-dialogue.wav", {
    headers: { Range: "bytes=-20" },
  });
  expect((await suffix.body()).length).toBe(20);
  const invalid = await request.get("/api/media/sample-dialogue.wav", {
    headers: { Range: "bytes=999999999-" },
  });
  expect(invalid.status()).toBe(416);
  const download = await request.get(
    "/api/media/sample-dialogue.wav?download=1",
  );
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect((await request.head("/api/media/sample-dialogue.wav")).status()).toBe(
    200,
  );
});

test("lesson exercises give feedback and record a completion once", async ({
  page,
}) => {
  await page.goto("/lessons/present-simple");
  await expect(
    page.getByRole("button", { name: "Mark as complete" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "B She walks to school." }).click();
  await page.getByRole("button", { name: "Check your answer" }).click();
  await expect(page.getByRole("status")).toContainText("You’ve got it!");
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(
    page.getByRole("button", { name: "Lesson completed" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Lesson completed" }),
  ).toBeDisabled();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(progress.completed).toEqual(["present-simple"]);
  expect(Object.values(progress.activity)).toEqual([1]);
});

test("quiz and matching games finish and preserve their results", async ({
  page,
}) => {
  await page.goto("/games/quiz");
  await page.getByRole("button", { name: "Let’s explore" }).click();
  for (let i = 0; i < 8; i++) {
    const word = await page.locator(".quiz-word").innerText();
    const definition = seed.words.find(
      (entry) => entry.word === word,
    )!.definition;
    await page.getByRole("button").filter({ hasText: definition }).click();
    await page.getByRole("button", { name: "Check meaning" }).click();
    await page
      .getByRole("button", { name: i === 7 ? "See how you did" : "Next word" })
      .click();
  }
  await expect(page.locator(".results-score")).toContainText("8");
  await page.goto("/games/match");
  await page.getByRole("button", { name: "Let’s find a match" }).click();
  const words = await page
    .locator(".matching-column")
    .first()
    .getByRole("button")
    .allTextContents();
  for (const word of words) {
    const definition = seed.words.find(
      (entry) => entry.word === word,
    )!.definition;
    await page.getByRole("button", { name: word, exact: true }).click();
    await page.getByRole("button", { name: definition, exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Everything found its place." }),
  ).toBeVisible();
  await page.reload();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(progress.attempts).toHaveLength(2);
  expect(
    progress.attempts.map((attempt: { score: number }) => attempt.score),
  ).toEqual([6, 8]);
});

test("school settings and content imports persist and validate failures", async ({
  page,
  request,
}) => {
  const initial = await (await request.get("/api/settings")).json();
  try {
    await page.goto("/settings");
    await page
      .getByRole("textbox", { name: "School name" })
      .fill("Local Language School");
    await page.getByRole("button", { name: "Save your welcome" }).click();
    await expect(page.getByRole("status")).toContainText("has been saved");
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: "School name" }),
    ).toHaveValue("Local Language School");
    const invalid = await request.put("/api/content", { data: { version: 1 } });
    expect(invalid.status()).toBe(400);
    const malformed = await request.put("/api/content", { data: "{bad" });
    expect(malformed.status()).toBe(400);
    const imported = await request.put("/api/content", { data: seed });
    expect(imported.ok()).toBe(true);
    expect(
      (await (await request.get("/api/content")).json()).words,
    ).toHaveLength(24);
    const uploaded = await request.post("/api/upload?name=test.pdf", {
      data: Buffer.from("%PDF-1.4\nlocal sample"),
      headers: { "X-LinguaLocal-Upload": "1" },
    });
    expect(uploaded.ok()).toBe(true);
    const file = (await uploaded.json()).file;
    expect((await request.get(`/api/media/${file}`)).status()).toBe(200);
    expect(
      (
        await request.post("/api/upload?name=../bad.pdf", {
          data: "bad",
          headers: { "X-LinguaLocal-Upload": "1" },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await request.put("/api/settings", { data: initial });
  }
});

test("corrupt progress recovers and storage failures remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("lingualocal.progress.v1", "broken"),
  );
  await page.reload();
  await expect(page.locator("h1:visible")).toBeVisible();
  await page.goto("/dictionary");
  await page.getByRole("button", { name: "Save curious", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unsave curious" }),
  ).toBeVisible();
});

test("all learning pages and assets work with external requests blocked", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    if (!route.request().url().startsWith("http://127.0.0.1:3100")) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  for (const route of [
    "/",
    "/library",
    "/dictionary",
    "/lessons",
    "/games",
    "/flashcards",
    "/progress",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1:visible")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  }
  expect(external).toEqual([]);
});
