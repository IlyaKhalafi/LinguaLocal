import { test, expect } from "@playwright/test";

test("video captions, playback speed, and passage loops work", async ({
  page,
}) => {
  await page.goto("/library/everyday-english");
  await page.getByRole("button", { name: "Watching", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator("video")).toHaveAttribute("playsinline", "");
  await page.waitForFunction(() => !!document.querySelector("video")?.duration);
  await page.getByLabel("Playback speed").selectOption("0.75");
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.playbackRate),
  ).toBe(0.75);
  await page.evaluate(async () => {
    const v = document.querySelector("video")!;
    await v.play();
    v.currentTime = 2;
  });
  await page.getByRole("button", { name: /Set loop start/ }).click();
  await page.evaluate(() => {
    document.querySelector("video")!.currentTime = 5;
  });
  await page.getByRole("button", { name: /Set loop end/ }).click();
  await page.evaluate(() => {
    const v = document.querySelector("video")!;
    v.currentTime = 7;
    v.dispatchEvent(new Event("timeupdate"));
  });
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.currentTime),
  ).toBeLessThan(4);
  await page
    .getByRole("button", { name: "Show captions", exact: true })
    .click();
  await page.waitForFunction(() => {
    const v = document.querySelector("video")!;
    return v.textTracks[0]?.cues?.length === 3;
  });
  await page.evaluate(() => {
    document.querySelector("video")!.playbackRate = 1.5;
  });
  await expect(page.getByLabel("Playback speed")).toHaveValue("1.5");
  const results = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => ({
      ready: v.readyState,
      captions: v.textTracks[0].cues!.length,
    }));
  expect(results.captions).toBe(3);
});
