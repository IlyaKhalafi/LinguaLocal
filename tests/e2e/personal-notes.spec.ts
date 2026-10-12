import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { translate, locales } from "../../src/lib/locale";

test("word and lesson notes stay private and travel in progress backups", async ({
  page,
}) => {
  await page.goto("/dictionary?search=curious");
  const note = page.locator(".word-card .personal-note").first();
  await expect(note.locator("textarea")).toBeHidden();
  await note.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(note.getByRole("textbox", { name: "My note" })).toBeFocused();
  await note
    .getByRole("textbox", { name: "My note" })
    .dispatchEvent("keydown", { key: "Escape", isComposing: true });
  await expect(note.getByRole("textbox", { name: "My note" })).toBeVisible();
  await note.getByRole("textbox", { name: "My note" }).fill("Keep asking why.");
  await note.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(note.getByRole("status")).toHaveText("Note saved.");
  await expect(
    note.getByRole("button", { name: "Close note", exact: true }),
  ).toBeFocused();
  await note.getByRole("textbox", { name: "My note" }).press("Escape");
  await expect(note.locator("summary")).toBeFocused();
  await expect(note.locator("textarea")).toBeHidden();
  await page.reload();
  await note.locator("summary").click();
  await expect(note.getByRole("textbox", { name: "My note" })).toHaveValue(
    "Keep asking why.",
  );
  await page.goto("/lessons/present-simple");
  await page.locator(".personal-note > summary").click();
  await page
    .getByRole("textbox", { name: "My note" })
    .fill("I practise every morning.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.goto("/settings");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my progress" }).click();
  const file = await downloaded;
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.notes).toEqual({
    "w/curious": "Keep asking why.",
    "l/present-simple": "I practise every morning.",
  });
  await page.evaluate(() => localStorage.removeItem("lingualocal.progress.v1"));
  await page.reload();
  await page.locator("#restore-progress").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole("button", { name: "Restore progress", exact: true })
    .click();
  await page.goto("/dictionary?search=curious");
  await note.locator("summary").click();
  await expect(note.getByRole("textbox", { name: "My note" })).toHaveValue(
    "Keep asking why.",
  );
  await note.getByRole("textbox", { name: "My note" }).fill("");
  await note.getByRole("button", { name: "Save note", exact: true }).click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(stored.notes).toEqual({
    "l/present-simple": "I practise every morning.",
  });
});

test("editing a note protects a draft from another tab", async ({
  page,
  context,
}) => {
  await page.goto("/dictionary?search=curious");
  const other = await context.newPage();
  await other.goto("/dictionary?search=curious");
  for (const tab of [page, other])
    await tab.locator(".personal-note > summary").first().click();
  await page
    .locator(".personal-note[open]")
    .getByRole("textbox", { name: "My note" })
    .fill("My unsaved draft");
  await other
    .locator(".personal-note[open]")
    .getByRole("textbox", { name: "My note" })
    .fill("The other tab");
  await other.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page.getByText("This note changed in another tab."),
  ).toBeVisible();
  await expect(
    page
      .locator(".personal-note[open]")
      .getByRole("textbox", { name: "My note" }),
  ).toHaveValue("My unsaved draft");
  await page.getByRole("button", { name: "Reload note" }).click();
  await expect(
    page
      .locator(".personal-note[open]")
      .getByRole("textbox", { name: "My note" }),
  ).toHaveValue("The other tab");
  await page
    .locator(".personal-note[open]")
    .getByRole("textbox", { name: "My note" })
    .fill("A fresh draft");
  await other
    .locator(".personal-note[open]")
    .getByRole("textbox", { name: "My note" })
    .fill("Another update");
  await other.getByRole("button", { name: "Save note", exact: true }).click();
  await page.getByRole("button", { name: "Overwrite note" }).click();
  await expect(
    page.getByText("This note changed in another tab."),
  ).toBeHidden();
  await expect(
    other
      .locator(".personal-note[open]")
      .getByRole("textbox", { name: "My note" }),
  ).toHaveValue("A fresh draft");
  const otherNote = other.locator(".personal-note[open]");
  await otherNote
    .getByRole("textbox", { name: "My note" })
    .fill("Last saved note");
  await otherNote
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(otherNote.getByRole("status")).toHaveText("Note saved.");
  const activeNote = page.locator(".personal-note[open]");
  await activeNote
    .getByRole("textbox", { name: "My note" })
    .fill("A temporary change");
  await activeNote
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(otherNote.getByRole("status")).toBeEmpty();
  await activeNote
    .getByRole("textbox", { name: "My note" })
    .fill("Last saved note");
  await activeNote
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(otherNote.getByRole("textbox", { name: "My note" })).toHaveValue(
    "Last saved note",
  );
  await expect(otherNote.getByRole("status")).toBeEmpty();
});

for (const locale of locales) {
  test(`${locale} notes keep mobile layout, contrast and keyboard focus`, async ({
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
    await page.goto("/dictionary?search=curious");
    const note = page.locator(".personal-note").first();
    await note.locator("summary").click();
    await expect(
      note.getByRole("textbox", { name: translate(locale, "My note") }),
    ).toBeFocused();
    await note
      .getByRole("textbox", { name: translate(locale, "My note") })
      .fill(locale === "en" ? "A private note" : translate(locale, "My note"));
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
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await note
      .getByRole("button", {
        name: translate(locale, "Close note"),
        exact: true,
      })
      .click();
    await expect(note.locator("summary")).toBeFocused();
  });
}
