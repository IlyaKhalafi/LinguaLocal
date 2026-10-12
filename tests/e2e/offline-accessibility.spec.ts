import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { locales, translate } from "../../src/lib/locale";
for (const locale of locales)
  test(`${locale} optional offline controls are readable and keyboard accessible`, async ({
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
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/settings");
    await page.locator(".offline-settings > summary").focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", {
        name: translate(locale, "Enable offline pages"),
        exact: true,
      }),
    ).toBeEnabled();
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
  });
test("unsupported contexts explain the requirement only inside the optional section", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    Object.defineProperty(window, "isSecureContext", { value: false }),
  );
  await page.goto("/settings");
  await expect(
    page.getByText("Offline pages require HTTPS or localhost.", {
      exact: true,
    }),
  ).not.toBeVisible();
  await page.locator(".offline-settings > summary").click();
  await expect(
    page.getByText("Offline pages require HTTPS or localhost.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable offline pages", exact: true }),
  ).toHaveCount(0);
});
