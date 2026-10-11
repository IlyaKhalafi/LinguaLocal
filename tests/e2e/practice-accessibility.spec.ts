import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { translate, type Locale } from "../../src/lib/locale";

for (const locale of ["en", "fa", "ar", "tr"] satisfies Locale[]) {
  test(`${locale} practice and timed transcript remain accessible on phones`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "lingualocal.locale",
        value: locale,
        url: "http://127.0.0.1:3100",
      },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/games/practice");
    await page
      .getByRole("button", {
        name: translate(locale, "Start practice"),
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel(translate(locale, "Your answer"), { exact: true }),
    ).toBeFocused();
    expect(
      (await new AxeBuilder({ page }).include("main").analyze()).violations,
    ).toEqual([]);
    await page.goto("/library/everyday-english");
    await page
      .getByRole("button", { name: translate(locale, "Watching"), exact: true })
      .click();
    await page
      .getByRole("button", { name: translate(locale, "Play"), exact: true })
      .click();
    await page
      .getByText(translate(locale, "Read the transcript"), { exact: true })
      .click();
    await expect(page.locator(".transcript-cues li")).toHaveCount(3);
    expect(
      (await new AxeBuilder({ page }).include("main").analyze()).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
