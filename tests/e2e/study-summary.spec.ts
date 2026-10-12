import { test, expect, type Download } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyProgress } from "../../src/lib/learning";
import { locales, translate } from "../../src/lib/locale";
async function downloaded(download: Download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
test("summaries share only totals and keep the optional name out of storage", async ({
  page,
}) => {
  await page.goto("/progress");
  const name = page.getByRole("textbox", {
    name: "Name (optional)",
    exact: true,
  });
  await page.evaluate(
    (progress) =>
      localStorage.setItem("lingualocal.progress.v1", JSON.stringify(progress)),
    {
      ...emptyProgress,
      saved: ["curious"],
      notes: { "w/curious": "A private thought" },
    },
  );
  await page.reload();
  await expect(page.locator(".share-summary:visible")).toHaveCount(1);
  await expect(name).not.toBeVisible();
  await page.locator(".share-summary > summary:visible").click();
  await name.fill("Sample learner");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download summary", exact: true })
    .click();
  const report = JSON.parse(await downloaded(await download));
  expect(report.name).toBe("Sample learner");
  expect(report.summary.wordsSaved).toBe(1);
  expect(JSON.stringify(report)).not.toMatch(/curious|private thought|notes/);
  expect(
    await page.evaluate(() => localStorage.getItem("lingualocal.progress.v1")),
  ).not.toContain("Sample learner");
  const print = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download print sheet", exact: true })
    .click();
  const html = await downloaded(await print);
  expect(html).toContain("<h1>Study summary</h1>");
  expect(html).not.toContain("NaN");
  await page.reload();
  await expect(page.locator(".share-summary:visible")).toHaveCount(1);
  await page.locator(".share-summary > summary:visible").click();
  await expect(name).toHaveValue("");
  await name.fill("\u200b");
  await page
    .getByRole("button", { name: "Download summary", exact: true })
    .click();
  await expect(
    page.locator(".share-summary:visible").getByRole("alert"),
  ).toContainText("Use a name");
  await name.fill("Student");
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error("No downloads");
    };
  });
  await page
    .getByRole("button", { name: "Download summary", exact: true })
    .click();
  await expect(
    page.locator(".share-summary:visible").getByRole("alert"),
  ).toContainText("Unable to download");
});
test("hidden streamed forms do not intercept summary input or downloads", async ({
  page,
}) => {
  await page.goto("/progress");
  await expect(page.locator(".share-summary")).toHaveCount(1);
  await page.locator(".share-summary").evaluate((panel) => {
    const copy = panel.cloneNode(true) as HTMLElement;
    for (const input of copy.querySelectorAll<HTMLInputElement>("input[id]")) {
      const id = input.id;
      input.id = `${id}-streamed`;
      for (const label of copy.querySelectorAll<HTMLLabelElement>("label"))
        if (label.htmlFor === id) label.htmlFor = input.id;
    }
    const streamed = document.createElement("div");
    streamed.hidden = true;
    streamed.append(copy);
    document.body.append(streamed);
  });
  const summary = page.locator(".share-summary > summary:visible");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Name (optional)")).toHaveCount(2);
  await page
    .getByRole("textbox", { name: "Name (optional)", exact: true })
    .fill("Sample learner");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download summary", exact: true })
    .click();
  expect(JSON.parse(await downloaded(await download)).name).toBe(
    "Sample learner",
  );
});
for (const locale of locales)
  test(`${locale} summary controls fit mobile and both appearances`, async ({
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/progress");
    const summary = page.locator(".share-summary > summary:visible");
    await expect(summary).toBeVisible();
    await summary.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("textbox", {
        name: translate(locale, "Name (optional)"),
        exact: true,
      })
      .fill("Sample learner");
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
    const print = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: translate(locale, "Download print sheet"),
        exact: true,
      })
      .click();
    expect(await downloaded(await print)).toContain(`lang="${locale}"`);
  });
