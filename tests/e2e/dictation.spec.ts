import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { translate, type Locale } from "../../src/lib/locale";

async function openPractice(
  page: import("@playwright/test").Page,
  locale: Locale = "en",
) {
  await page.context().addCookies([
    {
      name: "lingualocal.locale",
      value: locale,
      url: "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/library/everyday-english");
  await page
    .getByRole("button", { name: translate(locale, "Watching"), exact: true })
    .click();
  await page
    .getByRole("button", { name: translate(locale, "Play"), exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: translate(locale, "Practise listening") }),
  ).toBeHidden();
  await page
    .getByText(translate(locale, "Read the transcript"), { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: translate(locale, "Practise listening"),
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel(translate(locale, "Type what you hear")),
  ).toBeFocused();
}

test("dictation bounds playback, preserves keyboard focus and records one private result", async ({
  page,
}) => {
  await openPractice(page);
  await expect(page.locator(".transcript-cues")).toHaveCount(0);
  await expect(page.locator(".transcript > summary")).toBeHidden();
  await expect(page.locator("video")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Show captions", exact: true }),
  ).toBeHidden();
  await expect(page.locator(".dictation-reference")).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.locator("video").evaluate((video: HTMLVideoElement) => video.paused),
    )
    .toBe(true);
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.currentTime),
  ).toBeGreaterThanOrEqual(3.9);
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.currentTime),
  ).toBeLessThanOrEqual(4.05);
  const input = page.getByLabel("Type what you hear");
  await input.fill("hello a new conversation starts here");
  await input.press("Enter");
  await expect(page.getByLabel("Your answer")).toHaveValue(
    "hello a new conversation starts here",
  );
  await expect(page.getByLabel("Your answer")).toHaveAttribute("readonly", "");
  await expect(page.locator(".dictation").getByRole("status")).toContainText(
    "Correct.",
  );
  await expect(
    page.getByRole("button", { name: "Next passage", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(input).toBeFocused();
  await input.fill("How you today");
  await input.press("Enter");
  await expect(page.locator(".dictation-reference mark")).toHaveText("are");
  await page.keyboard.press("Enter");
  await input.fill("I am well thank you for asking");
  await input.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.locator(".dictation h4")).toBeFocused();
  await expect(page.locator(".dictation-result")).toContainText(
    "16 of 17 words",
  );
  await page
    .getByRole("button", { name: "Back to transcript", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Practise listening", exact: true }),
  ).toBeFocused();
  await expect(page.locator("video")).toBeVisible();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(progress.attempts).toHaveLength(1);
  expect(progress.attempts[0]).toMatchObject({
    title: "Dictation",
    score: 16,
    total: 17,
  });
});

test("returning to the transcript stops an unfinished passage without recording a result", async ({
  page,
}) => {
  await openPractice(page);
  await page
    .getByRole("button", { name: "Back to transcript", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((video: HTMLVideoElement) => video.paused),
    )
    .toBe(true);
  await expect(page.locator(".transcript-cues li")).toHaveCount(3);
  const stored = await page.evaluate(() =>
    localStorage.getItem("lingualocal.progress.v1"),
  );
  expect(stored === null || JSON.parse(stored).attempts.length === 0).toBe(
    true,
  );
});

test("leaving after a checked passage saves the partial attempt once", async ({
  page,
}) => {
  await openPractice(page);
  await page
    .getByLabel("Type what you hear")
    .fill("Hello a new conversation starts here");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to transcript", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("lingualocal.progress.v1")!)?.attempts
            .length,
      ),
    )
    .toBe(1);
  const attempt = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).attempts[0],
  );
  expect(attempt).toMatchObject({ title: "Dictation", score: 6, total: 6 });
  await page.getByRole("button", { name: "Close player" }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).attempts
          .length,
    ),
  ).toBe(1);
});

for (const locale of ["en", "fa", "ar", "tr"] as const) {
  test(`${locale} dictation stays readable on mobile in light and dark appearance`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPractice(page, locale);
    await page
      .getByLabel(translate(locale, "Type what you hear"))
      .fill("hello new conversation starts here");
    await page
      .getByRole("button", {
        name: translate(locale, "Check answer"),
        exact: true,
      })
      .click();
    await expect(page.locator(".dictation-reference mark")).toHaveText("A");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.appearance = theme;
      }, theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  });
}
