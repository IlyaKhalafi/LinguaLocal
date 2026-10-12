import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyProgress } from "../../src/lib/learning";
import { locales, translate } from "../../src/lib/locale";

test("a private tagged deck collects dictionary words and supports focused review", async ({
  page,
}) => {
  await page.goto("/flashcards");
  const manager = page.locator(".deck-manager");
  await expect(manager).toHaveCount(1);
  await expect(manager.getByLabel("Deck name")).toBeHidden();
  await manager.locator("summary").click();
  await manager.getByLabel("Deck name").fill("Travel");
  await manager.getByLabel("Tags, separated by commas").fill("school, travel");
  await manager.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(manager.getByRole("status")).toHaveText("Deck saved.");
  const id = await page.evaluate(
    () =>
      Object.keys(
        JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).decks,
      )[0],
  );
  for (const word of ["curious", "journey"]) {
    await page.goto(`/dictionary?search=${word}`);
    await page.locator(".word-decks > summary").first().click();
    await page.getByRole("checkbox", { name: "Travel", exact: true }).check();
  }
  await page.goto("/flashcards");
  await page.getByLabel("Tag", { exact: true }).selectOption("school");
  await page.getByLabel("Study deck", { exact: true }).selectOption(id);
  await expect(page.getByText("2 words available")).toBeVisible();
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  await page.locator(".flashcard").click();
  await page.locator(".review-ratings > summary").click();
  await page.getByRole("button", { name: "Hard", exact: true }).click();
  await expect(page.locator(".flashcard")).toBeFocused();
  await page.locator(".flashcard").click();
  await page.getByRole("button", { name: "I remembered", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review complete", exact: true }),
  ).toBeFocused();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(progress.decks[id].words.sort()).toEqual(["curious", "journey"]);
  expect(
    Object.values<{ ease: number }>(progress.reviews).some(
      (review) => review.ease < 2.2,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Review more words", exact: true })
    .click();
  await manager.locator("summary").click();
  await manager.getByLabel("Edit deck").selectOption(id);
  page.once("dialog", (dialog) => dialog.dismiss());
  await manager
    .getByRole("button", { name: "Delete deck", exact: true })
    .click();
  await expect(manager.getByLabel("Deck name")).toHaveValue("Travel");
  page.once("dialog", (dialog) => dialog.accept());
  await manager
    .getByRole("button", { name: "Delete deck", exact: true })
    .click();
  await expect(manager.getByLabel("Deck name")).toBeFocused();
  await expect(page.getByText("150 words available")).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(
        JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).decks,
      ),
    ),
  ).toEqual([]);
});

test("metadata edits preserve membership added in another tab", async ({
  page,
  context,
}) => {
  await page.goto("/flashcards");
  await page.locator(".deck-manager > summary").click();
  await page.getByLabel("Deck name").fill("My words");
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await page.getByLabel("Deck name").fill("Renamed");
  const other = await context.newPage();
  await other.goto("/dictionary?search=curious");
  await other.locator(".word-decks > summary").click();
  await other.getByRole("checkbox", { name: "My words", exact: true }).check();
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(
    other.getByRole("checkbox", { name: "Renamed", exact: true }),
  ).toBeChecked();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(Object.values<{ words: string[] }>(progress.decks)[0].words).toEqual([
    "curious",
  ]);
});

test("difficult-card practice and easy ratings retain bounded review state", async ({
  page,
}) => {
  await page.goto("/flashcards");
  await page.evaluate(
    (progress) =>
      localStorage.setItem("lingualocal.progress.v1", JSON.stringify(progress)),
    {
      ...emptyProgress,
      reviews: {
        curious: {
          interval: 0,
          repetitions: 0,
          due: "2026-10-12",
          ease: 1.3,
          lapses: 2,
        },
      },
    },
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Difficult words", exact: true })
    .click();
  await expect(
    page.getByText("1 word available", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  await page.locator(".flashcard").click();
  await page.locator(".review-ratings > summary").click();
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  const review = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).reviews
        .curious,
  );
  expect(review.interval).toBe(3);
  expect(review.ease).toBeCloseTo(1.45);
  expect(review.lapses).toBe(2);
});

test("deck drafts survive cancelled switching and deleted decks stay deleted", async ({
  page,
  context,
}) => {
  await page.goto("/flashcards");
  await page.evaluate(
    (progress) =>
      localStorage.setItem("lingualocal.progress.v1", JSON.stringify(progress)),
    {
      ...emptyProgress,
      decks: {
        first: { name: "First", tags: ["travel"], words: ["curious"] },
        second: { name: "Second", tags: ["school"], words: [] },
      },
    },
  );
  await page.reload();
  await page.locator(".deck-manager > summary").click();
  await page.getByLabel("Edit deck").selectOption("first");
  await page.getByLabel("Deck name").fill("Unfinished");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Edit deck").selectOption("second");
  await expect(page.getByLabel("Edit deck")).toHaveValue("first");
  await expect(page.getByLabel("Deck name")).toHaveValue("Unfinished");
  const other = await context.newPage();
  await other.goto("/flashcards");
  await other.locator(".deck-manager > summary").click();
  await other.getByLabel("Edit deck").selectOption("first");
  other.once("dialog", (dialog) => dialog.accept());
  await other.getByRole("button", { name: "Delete deck", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save deck", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Deck name")).toHaveValue("Unfinished");
  await page.getByLabel("Edit deck").selectOption("");
  await expect(page.getByLabel("Deck name")).toHaveValue("Unfinished");
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  expect(
    await page.evaluate(() =>
      Object.hasOwn(
        JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).decks,
        "first",
      ),
    ),
  ).toBe(false);
});

test("tag changes reset stale selections and empty tags can review the whole dictionary", async ({
  page,
  context,
}) => {
  await page.goto("/flashcards");
  await page.evaluate(
    (progress) =>
      localStorage.setItem("lingualocal.progress.v1", JSON.stringify(progress)),
    {
      ...emptyProgress,
      decks: {
        first: { name: "First", tags: ["travel"], words: ["curious"] },
        second: { name: "Empty", tags: ["travel", "school"], words: [] },
      },
    },
  );
  await page.reload();
  await page.getByLabel("Tag", { exact: true }).selectOption("travel");
  await page.getByLabel("Study deck").selectOption("first");
  const other = await context.newPage();
  await other.goto("/flashcards");
  await other.locator(".deck-manager > summary").click();
  await other.getByLabel("Edit deck").selectOption("first");
  await other.getByLabel("Tags, separated by commas").fill("changed");
  await other.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(page.getByLabel("Study deck")).toHaveValue("");
  await expect(
    page.getByRole("heading", {
      name: "No words in this selection",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review all words", exact: true })
    .click();
  await expect(page.locator(".flashcard")).toBeVisible();
});

for (const locale of locales) {
  test(`${locale} deck controls stay usable on mobile in both appearances`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "lingualocal.locale",
        value: locale,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/flashcards");
    const manager = page.locator(".deck-manager");
    await manager.locator("summary").click();
    await manager
      .getByLabel(translate(locale, "Deck name"))
      .fill(translate(locale, "My decks"));
    await manager
      .getByRole("button", {
        name: translate(locale, "Save deck"),
        exact: true,
      })
      .click();
    for (const route of ["/flashcards", "/dictionary?search=curious"]) {
      await page.goto(route);
      if (route.startsWith("/dictionary"))
        await page.locator(".word-decks > summary").click();
      else await page.locator(".deck-manager > summary").click();
      for (const appearance of ["light", "dark"]) {
        await page
          .locator("html")
          .evaluate(
            (html, value) => html.setAttribute("data-appearance", value),
            appearance,
          );
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
  });
}
