import { pageCatalogue } from "../../scripts/page-catalogue";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { direction, translate } from "../../src/lib/locale";

const routes = pageCatalogue;

for (const locale of ["fa", "ar", "tr"] as const) {
  test(`every page works in ${locale} on desktop and mobile`, async ({
    page,
    context,
  }) => {
    test.setTimeout(pageCatalogue.length * 8000);
    await context.addCookies([
      {
        name: "lingualocal.locale",
        value: locale,
        url: "http://127.0.0.1:3100",
      },
    ]);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const item of routes)
      await test.step(item.path, async () => {
        const route = item.path;
        await page.setViewportSize({ width: 1440, height: 1040 });
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("html")).toHaveAttribute(
          "dir",
          direction(locale),
        );
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          translate(locale, item.heading),
        );
        if (route === "/" || route === "/progress") {
          const ratio = page.locator(".goal-circle strong:visible");
          await expect(ratio).toHaveText(
            translate(locale, "{current} / {total}", { current: 0, total: 10 }),
          );
          const positions = await ratio
            .locator("bdi")
            .evaluateAll((numbers) =>
              numbers.map((number) => number.getBoundingClientRect().left),
            );
          expect(positions[0]).toBeLessThan(positions[1]);
        }
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.setViewportSize({ width: 390, height: 844 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page
          .getByRole("button", { name: translate(locale, "Open navigation") })
          .click();
        await expect(
          page.getByRole("link", {
            name: translate(locale, "Dictionary"),
            exact: true,
          }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", {
            name: translate(locale, "Open navigation"),
          }),
        ).toBeFocused();
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      });
    expect(errors).toEqual([]);
  });

  test(`language changes persist without changing English content or progress in ${locale}`, async ({
    page,
  }) => {
    await page.goto("/dictionary");
    await page
      .getByRole("button", { name: "Save curious", exact: true })
      .click();
    await page.locator("#interface-language").selectOption(locale);
    await expect(page.locator("h1")).toHaveText(
      translate(locale, "Dictionary"),
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      direction(locale),
    );
    await expect(page).toHaveTitle(
      `${translate(locale, "Dictionary")} | LinguaLocal`,
    );
    await expect(page.locator(".word-card").first()).toHaveAttribute(
      "dir",
      "ltr",
    );
    await expect(page.locator(".word-card").first()).toHaveAttribute(
      "lang",
      "en",
    );
    await page.reload();
    await expect(page.locator("#interface-language")).toHaveValue(locale);
    await page
      .getByRole("button", {
        name: translate(locale, "Saved words"),
        exact: true,
      })
      .click();
    await expect(page.locator(".word-card")).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: translate(locale, "Unsave {word}", { word: "curious" }),
      }),
    ).toBeVisible();
    await page.goto("/lessons/present-simple");
    await expect(page.locator(".lesson-section").first()).toHaveAttribute(
      "dir",
      "ltr",
    );
    await page.getByRole("button", { name: "B She walks to school." }).click();
    await page
      .getByRole("button", { name: translate(locale, "Check answer") })
      .click();
    await expect(page.getByRole("status")).toContainText(
      translate(locale, "Correct. "),
    );
    await page
      .getByRole("button", { name: translate(locale, "Mark as complete") })
      .click();
    await page.goto("/flashcards");
    await page
      .getByRole("button", {
        name: translate(locale, "Saved words"),
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: translate(locale, "Start review") })
      .click();
    await expect(page.locator(".game-progress")).toContainText(
      translate(locale, "Card {current} of {total}", { current: 1, total: 1 }),
    );
    await page
      .getByRole("button", {
        name: translate(locale, "Reveal meaning of {word}", {
          word: "curious",
        }),
      })
      .click();
    await page
      .getByRole("button", { name: translate(locale, "I remembered") })
      .click();
    await expect(
      page.getByRole("heading", { name: translate(locale, "Review complete") }),
    ).toBeVisible();
    await page.locator("#interface-language").selectOption("en");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    const progress = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
    );
    expect(progress.saved).toEqual(["curious"]);
    expect(progress.completed).toEqual(["present-simple"]);
    expect(progress.reviews.curious.repetitions).toBe(1);
  });
}

test("invalid language cookies fall back to English", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "lingualocal.locale",
      value: "invalid",
      url: "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});
