import { test, expect } from "@playwright/test";
import { emptyProgress } from "../../src/lib/learning";

test("backup restore previews changes and supports cancellation", async ({
  page,
}) => {
  await page.goto("/dictionary");
  await page.getByRole("button", { name: "Save curious", exact: true }).click();
  await page.goto("/settings");
  const backup = { ...emptyProgress, saved: ["journey"], goal: 15 };
  const selectBackup = () =>
    page
      .locator("#restore-progress")
      .setInputFiles({
        name: "progress.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup)),
      });
  await selectBackup();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).saved,
    ),
  ).toEqual(["curious"]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#restore-progress")).toBeFocused();
  await selectBackup();
  await page
    .getByRole("button", { name: "Restore progress", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Progress restored.");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).saved,
    ),
  ).toEqual(["journey"]);
  await page
    .getByRole("button", { name: "Reset progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reset progress", exact: true }),
  ).toBeFocused();
});
