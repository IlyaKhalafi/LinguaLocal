import { test, expect } from "@playwright/test";

test("dictionary links identify one entry and return to ordinary search", async ({
  page,
}) => {
  await page.goto("/dictionary?word=curious");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await expect(page.locator(".word-card h2")).toHaveText("curious");
  await page.getByRole("link", { name: "All words", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(12);
  await page.goto("/dictionary?word=curious");
  await page
    .getByRole("textbox", { name: "Search dictionary", exact: true })
    .fill("journey");
  await expect(
    page.getByRole("heading", { name: "journey", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "curious", exact: true }),
  ).toHaveCount(0);
  await expect(page).not.toHaveURL(/word=/);
  await page.goto("/dictionary?word=removed-word");
  await expect(
    page.getByRole("heading", { name: "No matching words", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".word-card")).toHaveCount(12);
});
