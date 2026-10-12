import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import seed from "../../src/content/starter.json";

for (const mobile of [false, true]) {
  test(`a completed lesson opens its own review and continues at the same level${mobile ? " on mobile" : ""}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const lesson = seed.lessons.find((item) => item.id === "asking-questions")!;
    await page.goto(`/lessons/${lesson.id}`);
    await expect(
      page.getByRole("button", { name: "Mark as complete", exact: true }),
    ).toHaveCount(0);
    await page
      .locator(".option")
      .filter({ hasText: lesson.options[lesson.answer] })
      .click();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Mark as complete", exact: true })
      .click();
    await expect(
      page.getByRole("status", { name: "Completed", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Next lesson", exact: true }),
    ).toHaveAttribute("href", "/lessons/ordering-food");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("link", { name: "Review lesson words", exact: true })
      .click();
    await expect(page).toHaveURL(/flashcards\?lesson=asking-questions$/);
    await expect(page.locator(".study-selector")).toHaveCount(0);
    for (const id of lesson.wordIds) {
      const word = seed.words.find((word) => word.id === id)!;
      await expect(page.locator(".flashcard h2")).toHaveText(word.word);
      await page.locator(".flashcard").focus();
      await page.keyboard.press("Space");
      await expect(page.locator(".flashcard .definition")).toHaveText(
        word.definition,
      );
      if (id === lesson.wordIds[0])
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      await page
        .getByRole("button", { name: "I remembered", exact: true })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: "Review complete", exact: true }),
    ).toBeFocused();
    const progress = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
    );
    expect(Object.keys(progress.reviews)).toEqual(lesson.wordIds);
    expect(progress.completed).toEqual([lesson.id]);
    await page
      .getByRole("button", { name: "Restart review", exact: true })
      .click();
    await expect(page.locator(".flashcard h2")).toHaveText(
      seed.words.find((word) => word.id === lesson.wordIds[0])!.word,
    );
    await expect(page.locator(".flashcard")).toBeFocused();
    await page.goto("/flashcards?lesson=critical-claims");
    const final = seed.lessons.find((item) => item.id === "critical-claims")!;
    for (const id of final.wordIds) {
      await expect(page.locator(".flashcard h2")).toHaveText(
        seed.words.find((word) => word.id === id)!.word,
      );
      await page.locator(".flashcard").click();
      await page
        .getByRole("button", { name: "I remembered", exact: true })
        .click();
    }
    await expect(
      page.getByRole("link", { name: "All lessons", exact: true }),
    ).toHaveAttribute("href", "/lessons");
    await expect(
      page.getByRole("link", { name: "Next lesson", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "All lessons", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("Lessons");
  });
}

test("switching between lesson review and the full dictionary resets the deck scope", async ({
  page,
}) => {
  await page.goto("/flashcards?lesson=present-simple");
  await expect(page.locator(".flashcard h2")).toHaveText("read");
  await page.getByRole("link", { name: "Flashcards", exact: true }).click();
  await expect(page.locator(".study-selector")).toBeVisible();
  await expect(page.locator(".flashcard")).toHaveCount(0);
  await page.goto("/flashcards?lesson=travel-phrases");
  await expect(page.locator(".flashcard h2")).toHaveText("direction");
  await page.getByRole("link", { name: "Back to lesson", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Your next stop");
});

test("invalid or repeated lesson scopes do not silently review unrelated words", async ({
  page,
}) => {
  for (const query of [
    "lesson=unknown",
    "lesson=",
    "lesson=present-simple&lesson=travel-phrases",
  ]) {
    await page.goto(`/flashcards?${query}`);
    await expect(page.locator("h1")).toHaveText("Page not found");
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached();
    await expect(page.locator(".flashcard")).toHaveCount(0);
  }
});

test("review results retain focus and an empty due list offers a direct review", async ({
  page,
}) => {
  await page.goto("/flashcards");
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  const first = await page.locator(".flashcard h2").innerText();
  for (let index = 0; index < 20; index++) {
    await page.locator(".flashcard").click();
    await page
      .getByRole("button", {
        name: index ? "I remembered" : "Not yet",
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("button", { name: "Review more words", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "150 words available", exact: true }),
  ).toBeFocused();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  const id = seed.words.find((word) => word.word === first)!.id;
  expect(progress.reviews[id]).toMatchObject({ interval: 0, repetitions: 0 });
  await page.evaluate((words) => {
    const stored = JSON.parse(localStorage.getItem("lingualocal.progress.v1")!);
    stored.reviews = Object.fromEntries(
      words.map((word) => [
        word.id,
        { interval: 180, repetitions: 8, due: "2099-01-01" },
      ]),
    );
    localStorage.setItem("lingualocal.progress.v1", JSON.stringify(stored));
  }, seed.words);
  await page.reload();
  await page
    .getByRole("button", { name: "Due for review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No cards due", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review all words", exact: true })
    .click();
  await expect(page.locator(".flashcard")).toBeFocused();
  await expect(page.locator(".flashcard h2")).toBeVisible();
});
