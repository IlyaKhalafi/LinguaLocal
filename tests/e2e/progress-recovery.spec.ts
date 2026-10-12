import { test, expect } from "@playwright/test";
import { emptyProgress } from "../../src/lib/learning";

test("partial corruption preserves valid progress and the latest recovery copy", async ({
  page,
}) => {
  await page.goto("/dictionary");
  const damaged = {
    ...emptyProgress,
    saved: ["curious"],
    completed: ["present-simple"],
    goal: 15,
    reviews: { curious: { interval: 1, repetitions: 1, due: "2026-99-99" } },
  };
  await page.evaluate((progress) => {
    localStorage.setItem("lingualocal.progress.v1", JSON.stringify(progress));
    localStorage.setItem(
      "lingualocal.progress.v1.corrupt",
      "original recovery copy",
    );
  }, damaged);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unsave curious", exact: true }),
  ).toBeVisible();
  await page.goto("/progress");
  await expect(page.locator("#daily-goal")).toHaveValue("15");
  await page
    .locator("summary")
    .filter({ hasText: "Completed lessons" })
    .click();
  await expect(
    page.getByText("✓ Everyday habits, simple sentences", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("lingualocal.progress.v1.corrupt"),
    ),
  ).toBe(JSON.stringify(damaged));
  expect(
    await page.evaluate(() => localStorage.getItem("lingualocal.progress.v1")),
  ).toBe(JSON.stringify(damaged));
});
