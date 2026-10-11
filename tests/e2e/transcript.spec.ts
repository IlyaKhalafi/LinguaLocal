import { test, expect } from "@playwright/test";

test("player keeps extra controls folded and a timed transcript seeks playback", async ({
  page,
}) => {
  await page.goto("/library/everyday-english");
  await page.getByRole("button", { name: "Watching", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Set loop start/ }),
  ).toBeHidden();
  await page.getByText("Read the transcript", { exact: true }).click();
  await expect(page.locator(".transcript-cues li")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Play from 0:04", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThanOrEqual(4);
  await expect(
    page.getByRole("button", { name: "Play from 0:04", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.paused),
  ).toBe(false);
  await page.getByText("Repeat a passage", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Set loop start/ }),
  ).toBeVisible();
});

test("selected transcript text opens the dictionary with its query", async ({
  page,
}) => {
  await page.goto("/library/everyday-english");
  await page.getByRole("button", { name: "Listening", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByText("Read the transcript", { exact: true }).click();
  await page.locator(".transcript p[lang=en]").evaluate((paragraph) => {
    const text = paragraph.firstChild!;
    const start = text.textContent!.indexOf("curious");
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, start + 7);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    paragraph.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page.getByRole("link", { name: "Look up curious" }).click();
  await expect(
    page.getByRole("textbox", { name: "Search dictionary" }),
  ).toHaveValue("curious");
  await expect(page.locator(".word-card")).toHaveCount(1);
});

test("broken timed captions preserve the readable fallback", async ({
  page,
}) => {
  await page.route("**/api/media/*.vtt", (route) =>
    route.fulfill({ body: "broken file" }),
  );
  await page.goto("/library/everyday-english");
  await page.getByRole("button", { name: "Watching", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByText("Read the transcript", { exact: true }).click();
  await expect(page.locator(".transcript").getByRole("status")).toHaveText(
    "Timed transcript is unavailable.",
  );
  await expect(page.locator(".transcript p[lang=en]")).toContainText("Hello.");
});
