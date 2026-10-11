import { test, expect } from "@playwright/test";
import seed from "../../src/content/starter.json";

test("dictionary pages reach every word without interrupting search", async ({
  page,
}) => {
  await page.goto("/dictionary");
  await expect(page.locator(".word-card")).toHaveCount(12);
  const seen: string[] = [];
  for (let index = 0; index < Math.ceil(seed.words.length / 12); index++) {
    if (index) {
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .click();
      await expect(page.locator(".result-caption")).toBeFocused();
    }
    seen.push(...(await page.locator(".word-card h2").allTextContents()));
  }
  expect(seen).toEqual(seed.words.map((word) => word.word));
  await expect(
    page.getByRole("button", { name: "Next page", exact: true }),
  ).toBeDisabled();
  const search = page.getByRole("textbox", { name: "Search dictionary" });
  await search.fill("curious");
  await expect(search).toBeFocused();
  await expect(page.locator(".word-card")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Result pages" }),
  ).toHaveCount(0);
  await search.fill("");
  await expect(page.locator(".word-card h2").first()).toHaveText(
    seed.words[0].word,
  );
});

test("removing the last saved result keeps keyboard focus on the results", async ({
  page,
}) => {
  await page.goto("/dictionary");
  await page.getByRole("button", { name: "Save curious", exact: true }).click();
  await page.getByRole("button", { name: "Saved words", exact: true }).click();
  await page
    .getByRole("button", { name: "Unsave curious", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No saved words" }),
  ).toBeVisible();
  await expect(page.locator(".result-caption")).toBeFocused();
});

test("unsaving the final card on a page returns to its nearest saved word", async ({
  page,
}) => {
  await page.goto("/dictionary");
  await page.evaluate(
    (ids) => {
      localStorage.setItem(
        "lingualocal.progress.v1",
        JSON.stringify({
          saved: ids,
          completed: [],
          reviews: {},
          attempts: [],
          activity: {},
          goal: 10,
        }),
      );
    },
    seed.words.slice(0, 13).map((word) => word.id),
  );
  await page.reload();
  await page.getByRole("button", { name: "Saved words", exact: true }).click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page
    .getByRole("button", { name: `Unsave ${seed.words[12].word}`, exact: true })
    .click();
  await expect(page.locator(".word-card")).toHaveCount(12);
  await expect(
    page.getByRole("button", {
      name: `Unsave ${seed.words[11].word}`,
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: `Unsave ${seed.words[11].word}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: `Unsave ${seed.words[10].word}`,
      exact: true,
    }),
  ).toBeFocused();
});
