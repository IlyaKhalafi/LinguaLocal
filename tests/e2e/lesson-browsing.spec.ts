import { test, expect } from "@playwright/test";
import seed from "../../src/content/starter.json";
import newLessons from "../../src/content/lessons.json";

test("lesson pages restore filters and position after opening a lesson", async ({
  page,
}) => {
  await page.goto("/lessons");
  const seen: string[] = [];
  for (let index = 0; index < Math.ceil(seed.lessons.length / 6); index++) {
    if (index)
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .click();
    await expect(page.locator(".lesson-card:visible h2").first()).toHaveText(
      seed.lessons[index * 6].title,
    );
    seen.push(
      ...(await page.locator(".lesson-card:visible h2").allTextContents()),
    );
  }
  expect(seen).toEqual(seed.lessons.map((lesson) => lesson.title));
  await expect(
    page.getByRole("button", { name: "Next page", exact: true }),
  ).toBeDisabled();
  const title = await page.locator(".lesson-card h2").first().innerText();
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.locator("h1")).toHaveText(title);
  await page.goBack();
  await expect(page).toHaveURL(/page=3/);
  await expect(page.locator(".lesson-card h2").first()).toHaveText(title);
  await page.getByLabel("Filter lessons by subject").selectOption("Writing");
  await expect(page.locator(".lesson-card")).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel("Filter lessons by subject")).toHaveValue(
    "Writing",
  );
  await expect(page.locator(".lesson-card")).toHaveCount(1);
  await page.goBack();
  await expect(page.locator(".lesson-card h2").first()).toHaveText(title);
});

test("fast dictionary input and saved filters survive browser navigation", async ({
  page,
}) => {
  await page.goto("/dictionary");
  const input = page.getByRole("textbox", { name: "Search dictionary" });
  await input.pressSequentially("curious", { delay: 0 });
  await expect(input).toHaveValue("curious");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Save curious", exact: true }).click();
  await page.getByRole("button", { name: "Saved words", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Saved words", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/saved=1/);
  await page.getByRole("link", { name: "Flashcards", exact: true }).click();
  await expect(page).toHaveURL(/\/flashcards$/);
  await page.goBack();
  await expect(page).toHaveURL(/saved=1/);
  await expect(input).toHaveValue("curious");
  await expect(
    page.getByRole("button", { name: "Saved words", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Dictionary", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Saved words", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("every new lesson supports a complete learning session", async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const lesson of newLessons) {
    await page.goto(`/lessons/${lesson.id}`);
    await expect(page.locator("h1")).toHaveText(lesson.title);
    await page
      .locator(".option")
      .filter({ hasText: lesson.options[lesson.answer] })
      .click();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(page.locator(".feedback")).toContainText("Correct.");
    await page
      .getByRole("button", { name: "Mark as complete", exact: true })
      .click();
    await page.reload();
    await expect(
      page.getByRole("status", { name: "Completed", exact: true }),
    ).toBeVisible();
  }
});

test("back navigation and saved-page reload preserve the requested page", async ({
  page,
}) => {
  await page.goto("/dictionary?page=4");
  await expect(page.locator(".word-card:visible h2").first()).toHaveText(
    seed.words[36].word,
  );
  await page.goto("/dictionary?search=zzzzzzzz");
  await expect(
    page.getByRole("heading", { name: "No matching words", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/page=4/);
  await expect(page.locator(".word-card:visible h2").first()).toHaveText(
    seed.words[36].word,
  );
  await page.evaluate(
    (ids) =>
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
      ),
    seed.words.slice(0, 13).map((word) => word.id),
  );
  await page.goto("/dictionary?saved=1&page=2");
  await expect(page.locator(".word-card:visible h2")).toHaveText(
    seed.words[12].word,
  );
  await page.reload();
  await expect(page).toHaveURL(/saved=1&page=2/);
  await expect(page.locator(".word-card:visible h2")).toHaveText(
    seed.words[12].word,
  );
});
