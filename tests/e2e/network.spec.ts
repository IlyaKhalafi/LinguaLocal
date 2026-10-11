import { test, expect } from "@playwright/test";

test("localhost owners receive a shareable school address", async ({
  page,
}) => {
  await page.route("**/api/network", (route) =>
    route.fulfill({ json: { addresses: ["http://192.168.1.20:3000"] } }),
  );
  await page.goto("/settings");
  await expect(page.locator(".network-address")).toHaveCount(0);
  await page.getByRole("button", { name: "Show network address" }).click();
  await expect(
    page.getByRole("link", { name: "http://192.168.1.20:3000", exact: true }),
  ).toHaveAttribute("href", "http://192.168.1.20:3000");
});

test("address discovery failure keeps personal settings usable", async ({
  page,
}) => {
  await page.route("**/api/network", (route) =>
    route.fulfill({ status: 500, json: { error: "Unavailable" } }),
  );
  await page.goto("/settings");
  await page.getByRole("button", { name: "Show network address" }).click();
  await expect(
    page.getByText("Unable to find the school address.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export my progress" }),
  ).toBeEnabled();
});
