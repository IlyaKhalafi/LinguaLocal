import { test, expect } from "@playwright/test";

test("quiz and flashcard transitions keep keyboard focus in the exercise", async ({
  page,
}) => {
  await page.goto("/games/quiz");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.locator(".quiz-word")).toBeFocused();
  await page.locator(".option").first().click();
  await page.getByRole("button", { name: "Check meaning" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.locator(".quiz-word")).toBeFocused();
  await page.goto("/flashcards");
  await page.getByRole("button", { name: "Start review" }).click();
  await expect(page.locator(".flashcard")).toBeFocused();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "I remembered" }).click();
  await expect(page.locator(".flashcard")).toBeFocused();
  await expect(page.locator(".flashcard")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("matching and lesson completion retain a useful focus target", async ({
  page,
}) => {
  const content = await (await page.request.get("/api/content")).json();
  await page.goto("/games/match");
  await page.getByRole("button", { name: "Start matching" }).click();
  const word = await page
    .locator(".matching-column")
    .first()
    .getByRole("button")
    .first()
    .innerText();
  const definition = content.words.find(
    (entry: { word: string }) => entry.word === word,
  ).definition;
  await page.getByRole("button", { name: word, exact: true }).click();
  await page.getByRole("button", { name: definition, exact: true }).click();
  await expect(
    page
      .locator(".matching-column")
      .first()
      .getByRole("button")
      .filter({ hasNotText: "✓" })
      .first(),
  ).toBeFocused();
  await page.goto("/lessons/present-simple");
  await page.locator(".option").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator(".feedback")).toBeFocused();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".option").first()).toBeFocused();
  await page.locator(".option").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(
    page.getByRole("link", { name: "Review lesson words", exact: true }),
  ).toBeFocused();
});
