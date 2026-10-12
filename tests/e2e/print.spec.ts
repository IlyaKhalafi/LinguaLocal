import { test, expect } from "@playwright/test";

test("printing includes collapsed progress details and restores their state", async ({
  page,
}) => {
  await page.goto("/progress");
  const details = page.locator("details.print-expand");
  await expect(details).toHaveCount(2);
  await expect(details.locator("table")).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(details.first()).toHaveAttribute("open", "");
  await expect(details.last()).toHaveAttribute("open", "");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(details.first()).not.toHaveAttribute("open");
  await expect(details.last()).not.toHaveAttribute("open");
  await details.first().locator("summary").click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeprint"));
    window.dispatchEvent(new Event("afterprint"));
  });
  await expect(details.first()).toHaveAttribute("open", "");
  await expect(details.last()).not.toHaveAttribute("open");
});

test("checking a quiz answer keeps keyboard focus on the next action", async ({
  page,
}) => {
  await page.goto("/games/quiz");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await page.locator(".option").first().click();
  const check = page.getByRole("button", { name: "Check meaning" });
  await check.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Choose the meaning", { exact: true }),
  ).toBeHidden();
  await expect(page.getByRole("button", { name: "Next word" })).toBeFocused();
});
