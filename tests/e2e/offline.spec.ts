import { test, expect, type Page } from "@playwright/test";
async function command(page: Page, data: Record<string, unknown>) {
  return page.evaluate(async (input) => {
    const registration = await navigator.serviceWorker.ready;
    return new Promise<{
      ok: boolean;
      value?: {
        enabled: boolean;
        pages: number;
        media: { url: string; bytes: number }[];
      };
      error?: string;
    }>((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(
        () => reject(new Error("Worker timed out")),
        30_000,
      );
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        resolve(event.data);
        channel.port1.close();
      };
      registration.active!.postMessage(input, [channel.port2]);
    });
  }, data);
}
async function register(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/service-worker.js");
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  expect((await command(page, { type: "ENABLE", locale: "en" })).ok).toBe(true);
}
async function warm(page: Page) {
  const urls = await page.evaluate(() => [
    "/",
    location.href,
    ...performance.getEntriesByType("resource").map((entry) => entry.name),
  ]);
  expect((await command(page, { type: "WARM", urls })).ok).toBe(true);
}
test("optional worker restores visited pages and keeps language caches separate", async ({
  page,
  context,
}) => {
  await page.goto("/dictionary?word=curious");
  await register(page);
  await warm(page);
  await context.setOffline(true);
  await page.goto("/dictionary?word=curious");
  await expect(page.locator(".word-card h2")).toHaveText("curious");
  await page.getByRole("button", { name: "Save curious", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unsave curious", exact: true }),
  ).toBeVisible();
  expect(
    (await command(page, { type: "STATUS" })).value!.pages,
  ).toBeGreaterThanOrEqual(2);
  await command(page, { type: "LOCALE", locale: "fa" });
  await page.goto("/dictionary?word=curious");
  await expect(
    page.getByRole("heading", { name: "آفلاین هستید" }),
  ).toBeVisible();
  await context.setOffline(false);
  await command(page, { type: "DISABLE" });
  expect((await command(page, { type: "STATUS" })).value!.enabled).toBe(false);
  expect((await command(page, { type: "STATUS" })).value!.pages).toBe(0);
});
test("manifest and generated worker ship with the standalone release", async ({
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("LinguaLocal");
  const worker = await request.get("/service-worker.js");
  expect(worker.headers()["cache-control"]).toContain("no-cache");
  const source = await worker.text();
  expect(source).not.toMatch(/__LL_BUILD_ID__|__LL_OFFLINE_PAGES__|^import /m);
  expect((await request.get("/icons/app-512.png")).ok()).toBe(true);
});

test("selected media supports offline seeking, head requests and removal", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await register(page);
  expect(
    (
      await command(page, {
        type: "SAVE_MEDIA",
        url: "/api/media/sample-dialogue.wav",
      })
    ).ok,
  ).toBe(true);
  const before = (await command(page, { type: "STATUS" })).value!.media;
  expect(before).toHaveLength(1);
  await context.setOffline(true);
  const range = await page.evaluate(async () => {
    const response = await fetch("/api/media/sample-dialogue.wav", {
      headers: { Range: "bytes=0-9" },
    });
    return {
      status: response.status,
      size: (await response.arrayBuffer()).byteLength,
      range: response.headers.get("Content-Range"),
    };
  });
  expect(range.status).toBe(206);
  expect(range.size).toBe(10);
  expect(range.range).toMatch(/^bytes 0-9\/\d+$/);
  const head = await page.evaluate(async () => {
    const response = await fetch("/api/media/sample-dialogue.wav", {
      method: "HEAD",
    });
    return {
      status: response.status,
      length: response.headers.get("Content-Length"),
      size: (await response.arrayBuffer()).byteLength,
    };
  });
  expect(head.status).toBe(200);
  expect(Number(head.length)).toBeGreaterThan(10);
  expect(head.size).toBe(0);
  const invalid = await page.evaluate(
    async () =>
      (
        await fetch("/api/media/sample-dialogue.wav", {
          headers: { Range: "bytes=999999999999-" },
        })
      ).status,
  );
  expect(invalid).toBe(416);
  expect(
    (
      await command(page, {
        type: "REMOVE_MEDIA",
        url: "/api/media/sample-dialogue.wav",
      })
    ).ok,
  ).toBe(true);
  expect((await command(page, { type: "STATUS" })).value!.media).toHaveLength(
    0,
  );
  await context.setOffline(false);
});
