import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pageCatalogue } from "../../scripts/page-catalogue";
import seed from "../../src/content/starter.json";

test("preferences merge changes from another tab", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await page.getByText("Reading preferences", { exact: true }).click();
  const other = await context.newPage();
  await other.goto("/settings");
  await other.getByText("Reading preferences", { exact: true }).click();
  await other.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.getByLabel("Reading size", { exact: true }).selectOption("large");
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  await other.reload();
  await expect(other.locator("html")).toHaveAttribute(
    "data-reading-size",
    "large",
  );
});

test("dark learning feedback keeps contrast", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "lingualocal.preferences",
      value: encodeURIComponent(JSON.stringify({ appearance: "dark" })),
      url: "http://127.0.0.1:3100",
    },
  ]);
  const check = async () =>
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/games/quiz");
  await page.getByRole("button", { name: "Start quiz", exact: true }).click();
  const firstWord = await page.locator(".quiz-word").innerText();
  const word = seed.words.find((word) => word.word === firstWord)!;
  await page
    .locator(".option")
    .filter({ hasNotText: word.definition })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Check meaning", exact: true })
    .click();
  await expect(page.locator(".option.incorrect")).toBeVisible();
  await check();
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  const secondWord = await page.locator(".quiz-word").innerText();
  const correct = seed.words.find((word) => word.word === secondWord)!;
  await page.locator(".option").filter({ hasText: correct.definition }).click();
  await page
    .getByRole("button", { name: "Check meaning", exact: true })
    .click();
  await check();
  await page.goto("/games/match");
  await page
    .getByRole("button", { name: "Start matching", exact: true })
    .click();
  const firstTile = page
    .locator(".matching-column")
    .first()
    .getByRole("button")
    .first();
  const firstTileText = await firstTile.innerText();
  const matchedWord = seed.words.find((word) => word.word === firstTileText);
  await firstTile.click();
  await check();
  await page
    .getByRole("button", { name: matchedWord!.definition, exact: true })
    .click();
  await check();
  await page.goto("/flashcards");
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  await page.locator(".flashcard").click();
  await check();
});

test("appearance persists, follows the device and stays light when printed", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings");
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((body) => getComputedStyle(body).backgroundColor),
    )
    .toBe("rgb(17, 26, 22)");
  await page.reload();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(17, 26, 22)",
  );
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByLabel("Appearance", { exact: true }).selectOption("system");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(248, 249, 247)",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(17, 26, 22)",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
});

test("all pages retain contrast and fit in dark appearance", async ({
  page,
  context,
}) => {
  test.setTimeout(pageCatalogue.length * 7000);
  await context.addCookies([
    {
      name: "lingualocal.preferences",
      value: encodeURIComponent(JSON.stringify({ appearance: "dark" })),
      url: "http://127.0.0.1:3100",
    },
  ]);
  for (const route of pageCatalogue) {
    await page.goto(route.path);
    await expect(page.locator("h1:visible")).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).analyze()).violations,
      route.name,
    ).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route.name,
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations,
      route.name + " mobile",
    ).toEqual([]);
    await page.setViewportSize({ width: 1440, height: 1040 });
  }
});

test("unsupported dark appearance keeps the readable light theme", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = ((property: string, value?: string) =>
      property === "color" && value === "light-dark(white, black)"
        ? false
        : value === undefined
          ? supports(property)
          : supports(property, value)) as typeof CSS.supports;
  });
  await page.goto("/settings");
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-appearance",
    "light",
  );
  await expect(page.locator(".storage-notice")).toContainText(
    "Dark appearance is unavailable",
  );
});
