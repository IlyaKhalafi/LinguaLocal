import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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

test("network details can be closed and reopened", async ({ page }) => {
  await page.route("**/api/network", (route) =>
    route.fulfill({ json: { addresses: ["http://192.168.1.20:3000"] } }),
  );
  await page.goto("/settings");
  await page.getByRole("button", { name: "Show network address" }).click();
  await expect(
    page.getByRole("img", { name: "Scan to open LinguaLocal" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide network address" }).click();
  await expect(page.locator(".join-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "Show network address" }).click();
  await expect(page.locator(".network-address")).toBeVisible();
});

test("join QR follows the selected school address", async ({ page }) => {
  const addresses = ["http://192.168.1.20:3000", "http://10.0.0.20:3000"];
  await page.route("**/api/network", (route) =>
    route.fulfill({ json: { addresses } }),
  );
  await page.goto("/settings");
  await page.getByRole("button", { name: "Show network address" }).click();
  const qr = page.getByRole("img", { name: "Scan to open LinguaLocal" });
  await expect(qr).toHaveAttribute("src", /^data:image\/png;base64,/);
  const original = await qr.getAttribute("src");
  await page.locator("#join-address").selectOption(addresses[1]);
  await expect(page.locator(".network-address")).toHaveAttribute(
    "href",
    addresses[1],
  );
  await expect(qr).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(qr).not.toHaveAttribute("src", original!);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
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

for (const scenario of [
  {
    title: "empty interface list",
    status: 200,
    json: { addresses: [] },
    message: "Set the school address on the server.",
  },
  {
    title: "invalid configured address",
    status: 500,
    json: { code: "configuration" },
    message: "Ask the school to check its network address.",
  },
]) {
  test(`network panel explains ${scenario.title}`, async ({ page }) => {
    await page.route("**/api/network", (route) =>
      route.fulfill({ status: scenario.status, json: scenario.json }),
    );
    await page.goto("/settings");
    await page.getByRole("button", { name: "Show network address" }).click();
    await expect(
      page.getByRole("region", { name: "School network" }).getByRole("status"),
    ).toHaveText(scenario.message);
    await expect(
      page.getByRole("button", { name: "Show network address" }),
    ).toBeEnabled();
  });
}
