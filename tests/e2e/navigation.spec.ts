import { test, expect } from "@playwright/test";

test("dictionary shortcut closes mobile navigation and focuses search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/dictionary\?focus=search/);
  await expect(
    page.getByRole("textbox", { name: "Search dictionary" }),
  ).toBeFocused();
  await expect(page.locator(".workspace")).not.toHaveAttribute("inert");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.setViewportSize({ width: 1440, height: 1040 });
  await expect(page.locator(".mobile-menu")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("modified shortcut keys preserve the current page", async ({ page }) => {
  await page.goto("/lessons");
  await page.keyboard.press("Control+/");
  await page.keyboard.press("Meta+/");
  await page.keyboard.press("Alt+/");
  await expect(page).toHaveURL(/\/lessons$/);
});
