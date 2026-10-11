import { test, expect } from "@playwright/test";
import { dayKey, emptyProgress } from "../../src/lib/learning";
import { locales, translate } from "../../src/lib/locale";

for (const locale of locales) {
  test(`progress numbers keep their reading order in ${locale}`, async ({
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
    await page.addInitScript(
      (progress) => {
        localStorage.setItem(
          "lingualocal.progress.v1",
          JSON.stringify(progress),
        );
      },
      {
        ...emptyProgress,
        activity: { [dayKey()]: 3 },
        attempts: [
          {
            id: "practice",
            title: "Vocabulary quiz",
            score: 3,
            total: 8,
            date: new Date().toISOString(),
          },
        ],
      },
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/", "/progress"]) {
        await page.goto(path);
        const ratios = page.locator(".number-ratio:visible");
        await expect(ratios).toHaveCount(path === "/" ? 1 : 2);
        for (const ratio of await ratios.all()) {
          const total = await ratio.evaluate((element) =>
            element.closest(".attempt") ? 8 : 10,
          );
          const numbers = ratio.locator("bdi");
          await expect(numbers).toHaveText([
            translate(locale, "{count}", { count: 3 }),
            translate(locale, "{count}", { count: total }),
          ]);
          const positions = await numbers.evaluateAll((elements) =>
            elements.map((element) => element.getBoundingClientRect()),
          );
          expect(positions[0].right).toBeLessThan(positions[1].left);
        }
      }
    }
  });
}
