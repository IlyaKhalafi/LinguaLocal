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

test("offline settings stay optional and remove copies without clearing progress", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  await expect(
    page.getByRole("button", { name: "Enable offline pages", exact: true }),
  ).not.toBeVisible();
  await page.locator(".offline-settings > summary").click();
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  const remove = page.getByRole("button", {
    name: "Remove offline copies",
    exact: true,
  });
  await expect(remove).toBeEnabled();
  await page.goto("/dictionary");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const names = await caches.keys();
        const name = names.find((name) => name.endsWith("-pages"));
        return name
          ? (await (await caches.open(name)).keys()).some(
              (key) => new URL(key.url).pathname === "/dictionary",
            )
          : false;
      }),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Save curious", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("link", { name: "Dictionary", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Unsave curious", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search dictionary").fill("journey");
  await expect(
    page.locator(".word-card h2").filter({ hasText: "journey" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await remove.click();
  await expect(remove).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await remove.click();
  await expect(
    page.getByRole("button", { name: "Enable offline pages", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lingualocal.progress.v1")!).saved,
    ),
  ).toContain("curious");
});
test("offline enable errors can be retried and saved pages restore current reading preferences", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  await page.evaluate(() => {
    const original = navigator.serviceWorker.register.bind(
      navigator.serviceWorker,
    );
    let fail = true;
    navigator.serviceWorker.register = (...args) => {
      if (fail) {
        fail = false;
        return Promise.reject(new Error("Blocked"));
      }
      return original(...args);
    };
  });
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.locator(".offline-settings").getByRole("alert"),
  ).toContainText("Offline storage");
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove offline copies", exact: true }),
  ).toBeEnabled();
  await page.locator(".reading-settings > summary").click();
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  await context.setOffline(false);
});
test("installation is offered only after an explicit action", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove offline copies", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: {
        value: async () => {
          document.documentElement.dataset.promptRequested = "true";
        },
      },
      userChoice: { value: Promise.resolve({ outcome: "accepted" }) },
    });
    window.dispatchEvent(event);
  });
  expect(
    await page.locator("html").getAttribute("data-prompt-requested"),
  ).toBeNull();
  await page.getByRole("button", { name: "Install app", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-prompt-requested",
    "true",
  );
});

test("offline language changes use a saved page in the chosen language", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove offline copies", exact: true }),
  ).toBeEnabled();
  await page.locator(".language-select select").selectOption("fa");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const name = (await caches.keys()).find((name) =>
          name.endsWith("-pages"),
        );
        return name
          ? (await (await caches.open(name)).keys()).some(
              (key) =>
                new URL(key.url).pathname === "/settings" &&
                new URL(key.url).searchParams.get("__ll_locale") === "fa",
            )
          : false;
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.locator(".language-select select").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("cached navigation recovers when the school connection fails but the browser reports online", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove offline copies", exact: true }),
  ).toBeEnabled();
  await context.setOffline(true);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    }),
  );
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("main h1")).toBeVisible();
  await context.setOffline(false);
});

test("background prefetch failures never navigate away from the current page", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove offline copies", exact: true }),
  ).toBeEnabled();
  await context.setOffline(true);
  await page.evaluate(async () => {
    try {
      await fetch("/dictionary?_rsc=background", {
        headers: { RSC: "1", "Next-Router-Prefetch": "1" },
      });
    } catch {}
  });
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("saved pages include unvisited page chunks and preserve dictionary keyboard navigation", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await page.locator(".offline-settings > summary").click();
  await page
    .getByRole("button", { name: "Enable offline pages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove offline copies", exact: true }),
  ).toBeEnabled();
  await page.goto("/dictionary");
  await warm(page);
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/dictionary#search$/);
  await expect(page.getByLabel("Search dictionary")).toHaveCount(1);
  await expect(page.getByLabel("Search dictionary")).toBeFocused();
  await page.getByLabel("Search dictionary").fill("curious");
  await expect(page.locator(".word-card h2").first()).toHaveText("curious");
  await context.setOffline(false);
});
