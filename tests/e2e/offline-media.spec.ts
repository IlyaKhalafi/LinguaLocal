import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { translate, type Locale } from "../../src/lib/locale";

async function enable(page: Page) {
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove offline copies", exact: true }),
  ).toBeEnabled();
  await page.goto("/library/everyday-english");
  await page.locator(".offline-resources > summary").click();
}

test("offline book files remain optional and play with their captions", async ({
  page,
  context,
}) => {
  await page.goto("/library/everyday-english");
  await expect(page.locator(".offline-resources")).toHaveCount(0);
  await enable(page);
  for (const title of [
    "A new beginning",
    "Start with hello",
    "Your first conversation",
  ]) {
    await page
      .getByRole("button", { name: `Save offline ${title}`, exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: `Refresh copy ${title}`,
        exact: true,
      }),
    ).toBeEnabled();
  }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = (await caches.keys()).find((name) =>
          name.endsWith("-pages"),
        );
        return cache
          ? (await (await caches.open(cache)).keys()).some(
              (request) =>
                new URL(request.url).pathname === "/library/everyday-english",
            )
          : false;
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Watching", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() =>
    Number.isFinite(document.querySelector("video")?.duration),
  );
  await page
    .getByRole("button", { name: "Show captions", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector("video")?.textTracks[0]?.cues?.length === 3,
  );
  await page.getByText("Read the transcript", { exact: true }).click();
  await expect(page.locator(".transcript-cues li")).toHaveCount(3);
  const pdf = await page.evaluate(async () => {
    const response = await fetch("/api/media/greetings.pdf");
    return { ok: response.ok, header: (await response.text()).slice(0, 4) };
  });
  expect(pdf).toEqual({ ok: true, header: "%PDF" });
  await page.locator(".offline-resources > summary").click();
  await page
    .getByRole("button", {
      name: "Remove copy Start with hello",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Save offline Start with hello",
      exact: true,
    }),
  ).toBeFocused();
  await expect(
    page
      .locator(".offline-resources")
      .getByText("Saved offline", { exact: true }),
  ).toHaveCount(2);
  await context.setOffline(false);
});

test("failed offline refresh retains a playable saved copy", async ({
  page,
  context,
}) => {
  await enable(page);
  const save = page.getByRole("button", {
    name: "Save offline A new beginning",
    exact: true,
  });
  await save.click();
  const refresh = page.getByRole("button", {
    name: "Refresh copy A new beginning",
    exact: true,
  });
  await expect(refresh).toBeEnabled();
  await context.setOffline(true);
  await refresh.click();
  await expect(page.locator(".offline-resources [role=alert]")).toContainText(
    "Unable to update this offline copy. Reconnect and try again.",
  );
  await expect(refresh).toBeEnabled();
  expect(
    await page.evaluate(
      async () =>
        (
          await fetch("/api/media/sample-dialogue.wav", {
            headers: { Range: "bytes=0-9" },
          })
        ).status,
    ),
  ).toBe(206);
  await context.setOffline(false);
});

for (const locale of ["en", "fa", "ar", "tr"] as Locale[]) {
  test(`${locale} offline book controls fit on mobile in both appearances`, async ({
    page,
    context,
  }) => {
    await enable(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      {
        name: "lingualocal.locale",
        value: locale,
        url: "http://127.0.0.1:3100",
      },
    ]);
    await page.reload();
    await page.locator(".offline-resources > summary").click();
    await expect(
      page.getByRole("button", {
        name: `${translate(locale, "Save offline")} Start with hello`,
        exact: true,
      }),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const appearance of ["light", "dark"]) {
      await page
        .locator("html")
        .evaluate(
          (html, value) => html.setAttribute("data-appearance", value),
          appearance,
        );
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
