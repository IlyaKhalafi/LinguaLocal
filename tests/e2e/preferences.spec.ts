import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pageCatalogue } from "../../scripts/page-catalogue";

test("reading choices apply immediately and survive server-rendered navigation", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByLabel("Reading size")).toBeHidden();
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByLabel("Reading size").selectOption("large");
  await page.getByLabel("Line spacing").selectOption("relaxed");
  await page.getByLabel("Reading font").selectOption("readable");
  await page.getByLabel("Quiet mode", { exact: true }).check();
  await page.getByLabel("High contrast", { exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-quiet", "true");
  await page.goto("/dictionary");
  const definition = page.locator(".word-card .definition").first();
  await expect(definition).toHaveCSS("font-size", "18px");
  await expect(definition).toHaveCSS("line-height", "36px");
  expect(
    await definition.evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain("Atkinson");
  await page.goto("/games");
  await expect(page.locator(".game-art").first()).toBeHidden();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.goto("/settings");
  await page.getByText("Reading preferences", { exact: true }).click();
  await expect(page.getByLabel("Reading size")).toHaveValue("large");
  await expect(page.getByLabel("Quiet mode", { exact: true })).toBeChecked();
});

test("blocked cookies and storage keep preferences usable with separate notices", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, "cookie", {
      configurable: true,
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
      set() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await page.goto("/settings");
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByLabel("Reading size").selectOption("large");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reading-size",
    "large",
  );
  await expect(
    page.getByText("Preferences will last for this visit.", { exact: true }),
  ).toBeVisible();
  const notices = page.locator(".client-notices .storage-notice");
  await expect(notices).toHaveCount(2);
  const first = await notices.first().boundingBox(),
    second = await notices.last().boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Dictionary", exact: true })
    .click();
  await expect(page.locator(".word-card .definition").first()).toHaveCSS(
    "font-size",
    "18px",
  );
});

test("larger reading settings keep every page usable on phones", async ({
  page,
  context,
}) => {
  test.setTimeout(pageCatalogue.length * 6000);
  await context.addCookies([
    {
      name: "lingualocal.preferences",
      value: encodeURIComponent(
        JSON.stringify({
          size: "large",
          spacing: "relaxed",
          font: "readable",
          contrast: true,
          quiet: true,
        }),
      ),
      url: "http://127.0.0.1:3100",
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of pageCatalogue) {
    await page.goto(route.path);
    await expect(page.locator("h1:visible")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route.path,
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
      route.path,
    ).toEqual([]);
  }
});
