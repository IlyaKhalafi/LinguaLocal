import { test, expect } from "@playwright/test";

for (const locale of ["fa", "ar"] as const) {
  test(`search placeholders and typed text follow their language in ${locale}`, async ({
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
    for (const path of ["/dictionary", "/library", "/lessons"]) {
      await page.goto(path);
      const search = page.getByRole("textbox");
      await expect(search).toHaveCSS("direction", "rtl");
      await search.fill("English");
      await expect(search).toHaveCSS("direction", "ltr");
      await search.fill("فارسی");
      await expect(search).toHaveCSS("direction", "rtl");
      await search.fill("");
      await expect(search).toHaveCSS("direction", "rtl");
    }
  });
}
