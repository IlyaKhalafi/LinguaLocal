import { test, expect } from "@playwright/test";

test("Play starts playback and closing returns focus to its opener", async ({
  page,
}) => {
  await page.goto("/library/everyday-english");
  await page.getByRole("button", { name: "Listening", exact: true }).click();
  const play = page.getByRole("button", { name: "Play", exact: true });
  await play.click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => audio.currentTime),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Close player" }).click();
  await expect(play).toBeFocused();
  await expect(page.locator("audio")).toHaveCount(0);
});

test("native playback speeds stay selected and caption errors survive playback", async ({
  page,
}) => {
  await page.route("**/api/media/*.vtt", (route) =>
    route.fulfill({ status: 404, body: "Missing captions" }),
  );
  await page.goto("/library/everyday-english");
  await page.getByRole("button", { name: "Watching", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThan(0);
  await page.locator("video").evaluate((video: HTMLVideoElement) => {
    video.playbackRate = 1.75;
  });
  await expect(page.locator("#playback-speed")).toHaveValue("1.75");
  await page
    .getByRole("button", { name: "Show captions", exact: true })
    .click();
  await expect(page.locator(".media-player").getByRole("alert")).toHaveText(
    "Captions could not be loaded. Ask your school to check the caption file.",
  );
  await page.locator("video").evaluate(async (video: HTMLVideoElement) => {
    video.pause();
    await video.play();
  });
  await expect(page.locator(".media-player").getByRole("alert")).toHaveText(
    "Captions could not be loaded. Ask your school to check the caption file.",
  );
});
