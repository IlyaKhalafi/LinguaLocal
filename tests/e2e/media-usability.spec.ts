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
