import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { translate, type Locale } from "../../src/lib/locale";
import seed from "../../src/content/starter.json";

test.use({ reducedMotion: "reduce" });
const bookPath = "/library/everyday-english";
async function requireNativeRecording(page: Page) {
  await page.goto(bookPath);
  const available = await page.evaluate(
    () => typeof MediaRecorder !== "undefined",
  );
  if (process.env.VOICE_NATIVE_REQUIRED === "1") expect(available).toBe(true);
  test.skip(
    !available,
    "This browser build does not provide native MediaRecorder",
  );
}

type Fixture = {
  calls: number;
  stopped: number;
  declined: boolean;
  failWrite: boolean;
};

async function microphone(page: Page) {
  await page.addInitScript(() => {
    const fixture = { calls: 0, stopped: 0, declined: false, failWrite: false };
    Object.assign(window, { voiceFixture: fixture });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          fixture.calls++;
          if (fixture.declined)
            throw new DOMException("declined", "NotAllowedError");
          const audio = new AudioContext();
          const oscillator = audio.createOscillator();
          const destination = audio.createMediaStreamDestination();
          oscillator.connect(destination);
          oscillator.start();
          await audio.resume();
          for (const track of destination.stream.getTracks()) {
            const stop = track.stop.bind(track);
            track.stop = () => {
              if (track.readyState !== "ended") fixture.stopped++;
              stop();
              void audio.close();
            };
          }
          return destination.stream;
        },
      },
    });
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "clips" && fixture.failWrite)
        throw new DOMException("full", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
}

async function fixture(page: Page, changes?: Partial<Fixture>) {
  return page.evaluate((values) => {
    const state = (window as unknown as { voiceFixture: Fixture }).voiceFixture;
    if (values) Object.assign(state, values);
    return state;
  }, changes);
}

async function open(page: Page, locale: Locale = "en") {
  await expect(page.locator(".voice-practice > summary")).toHaveCount(1);
  await page.locator(".voice-practice > summary").click();
  await expect(
    page.getByRole("button", {
      name: translate(locale, "Record a take"),
      exact: true,
    }),
  ).toBeVisible();
}

async function record(page: Page) {
  await page
    .getByRole("button", { name: "Record a take", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("button", { name: "Stop and save", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1200);
  await page
    .getByRole("button", { name: "Stop and save", exact: true })
    .press("Space");
}

async function seedTakes(page: Page, count: number, unreadable = false) {
  await page.evaluate(
    async ({ count, unreadable }) => {
      const data = await (
        await fetch("/demo/sample-dialogue.wav")
      ).arrayBuffer();
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("lingualocal-recordings", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("clips", { keyPath: "id" });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("clips", "readwrite");
          for (let index = 0; index < count; index++)
            tx.objectStore("clips").put({
              id: crypto.randomUUID(),
              bookId: "everyday-english",
              title: unreadable ? "" : "Everyday English",
              createdAt: Date.now() - index * 60_000,
              seconds: 3,
              mimeType: "audio/wav",
              data,
            });
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { count, unreadable },
  );
}

async function stored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("lingualocal-recordings", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{ id: string; size: number; seconds: number }[]>(
        (resolve, reject) => {
          const tx = db.transaction("clips", "readonly");
          const request = tx.objectStore("clips").getAll();
          request.onsuccess = () =>
            resolve(
              request.result.map((take) => ({
                id: take.id,
                size: take.data.byteLength,
                seconds: take.seconds,
              })),
            );
          request.onerror = () => reject(request.error);
        },
      );
    } finally {
      db.close();
    }
  });
}

test("native recordings stay private, play, download, reload and sync deletion", async ({
  page,
  context,
}) => {
  await requireNativeRecording(page);
  await microphone(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.goto(bookPath);
  await open(page);
  expect((await fixture(page)).calls).toBe(0);
  await record(page);
  await expect(page.locator(".recording-list > li")).toHaveCount(1);
  expect((await fixture(page)).stopped).toBe(1);
  const audio = page.locator(".recording-list audio");
  await expect
    .poll(() =>
      audio.evaluate((element: HTMLAudioElement) => element.readyState),
    )
    .toBeGreaterThanOrEqual(1);
  await audio.evaluate(async (element: HTMLAudioElement) => {
    await element.play();
    element.pause();
  });
  const initialUrl = await audio.getAttribute("src");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(200);
  expect(await audio.getAttribute("src")).toBe(initialUrl);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Download take / }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(
    /^everyday-english-.*\.(webm|m4a|ogg)$/,
  );
  expect((await readFile((await file.path())!)).length).toBeGreaterThan(100);
  await page.reload();
  await open(page);
  await expect(page.locator(".recording-list > li")).toHaveCount(1);
  const other = await context.newPage();
  await other.goto(`/library/${seed.books[1].id}`);
  await open(other);
  await expect(other.locator(".recording-list > li")).toHaveCount(1);
  const url = await page.locator(".recording-list audio").getAttribute("src");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: /^Delete take / }).click();
  await expect(page.locator(".recording-list > li")).toHaveCount(0);
  await expect(other.locator(".recording-list > li")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Record a take", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      (url) =>
        fetch(url!).then(
          () => false,
          () => true,
        ),
      url,
    ),
  ).toBe(true);
  expect(writes).toEqual([]);
});

test("declined microphone access is recoverable and never starts on opening", async ({
  page,
}) => {
  await requireNativeRecording(page);
  await microphone(page);
  await page.goto(bookPath);
  await fixture(page, { declined: true });
  await open(page);
  expect((await fixture(page)).calls).toBe(0);
  await page
    .getByRole("button", { name: "Record a take", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Microphone access was declined" }),
  ).toBeVisible();
  expect((await fixture(page)).calls).toBe(1);
  await fixture(page, { declined: false });
  await record(page);
  await expect(page.locator(".recording-list > li")).toHaveCount(1);
});

test("failed storage retains a playable downloadable take and retries once", async ({
  page,
}) => {
  await requireNativeRecording(page);
  await microphone(page);
  await page.goto(bookPath);
  await fixture(page, { failWrite: true });
  await open(page);
  await record(page);
  await expect(page.locator(".unsaved-take")).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Recording storage is full" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download take", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.(webm|m4a|ogg)$/);
  await fixture(page, { failWrite: false });
  await page
    .getByRole("link", { name: "Back to library", exact: true })
    .click();
  let unloadPrompts = 0;
  page.on("dialog", async (dialog) => {
    expect(dialog.type()).toBe("beforeunload");
    unloadPrompts++;
    await dialog.dismiss();
  });
  await page.evaluate(() => location.reload());
  await expect.poll(() => unloadPrompts).toBe(1);
  await expect(page).toHaveURL(/\/library$/);
  await page
    .getByRole("link", { name: new RegExp(seed.books[1].title) })
    .first()
    .click();
  await open(page);
  await expect(page.locator(".unsaved-take")).toBeVisible();
  await page
    .locator(".unsaved-take")
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await expect(page.locator(".unsaved-take")).toHaveCount(0);
  await expect(page.locator(".recording-list > li")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Record a take", exact: true }),
  ).toBeFocused();
  expect(await stored(page)).toHaveLength(1);
  await page.reload();
  expect(unloadPrompts).toBe(1);
});

test("closing practice and navigating away save the take and release the microphone", async ({
  page,
}) => {
  await requireNativeRecording(page);
  await microphone(page);
  await page.goto(bookPath);
  await open(page);
  await page
    .getByRole("button", { name: "Record a take", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop and save", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  await page.locator(".voice-practice > summary").click();
  await expect(page.locator(".recording-list > li")).toHaveCount(1);
  expect((await fixture(page)).stopped).toBe(1);
  await open(page);
  await page
    .getByRole("button", { name: "Record a take", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop and save", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  await page
    .getByRole("link", { name: "Back to library", exact: true })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  expect((await fixture(page)).stopped).toBe(2);
  await expect.poll(async () => (await stored(page)).length).toBe(2);
});

test("two tabs respect the device limit atomically and retain the extra take", async ({
  page,
  context,
}) => {
  await requireNativeRecording(page);
  await microphone(page);
  await page.goto(bookPath);
  await seedTakes(page, 9);
  await open(page);
  await expect(page.locator(".recording-list > li")).toHaveCount(9);
  const other = await context.newPage();
  await microphone(other);
  await other.goto(bookPath);
  await open(other);
  await expect(other.locator(".recording-list > li")).toHaveCount(9);
  await Promise.all([record(page), record(other)]);
  await expect(page.locator(".recording-list > li")).toHaveCount(10);
  await expect(other.locator(".recording-list > li")).toHaveCount(10);
  await expect
    .poll(
      async () =>
        (await page.locator(".unsaved-take").count()) +
        (await other.locator(".unsaved-take").count()),
    )
    .toBe(1);
  const pending = (await page.locator(".unsaved-take").count()) ? page : other;
  const saved = pending === page ? other : page;
  expect(await stored(page)).toHaveLength(10);
  saved.once("dialog", (dialog) => void dialog.accept());
  await saved
    .getByRole("button", { name: /^Delete take / })
    .first()
    .click();
  await expect(pending.locator(".recording-list > li")).toHaveCount(9);
  await pending
    .locator(".unsaved-take")
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await expect(pending.locator(".unsaved-take")).toHaveCount(0);
  await expect(saved.locator(".recording-list > li")).toHaveCount(10);
  expect(await stored(page)).toHaveLength(10);
});

test("unreadable rows stay recoverable and can be removed without losing valid takes", async ({
  page,
}) => {
  await requireNativeRecording(page);
  await microphone(page);
  await page.goto(bookPath);
  await seedTakes(page, 1, true);
  await open(page);
  await expect(
    page.getByText("Some saved takes cannot be read.", { exact: true }),
  ).toBeVisible();
  await record(page);
  await expect(page.locator(".recording-list > li")).toHaveCount(1);
  expect(await stored(page)).toHaveLength(2);
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .getByRole("button", { name: "Remove unreadable takes", exact: true })
    .click();
  await expect(
    page.getByText("Some saved takes cannot be read.", { exact: true }),
  ).toBeHidden();
  expect(await stored(page)).toHaveLength(1);
});

test("the minute limit stops capture and releases its track", async ({
  page,
}) => {
  await requireNativeRecording(page);
  await microphone(page);
  await page.clock.install();
  await page.goto(bookPath);
  await open(page);
  await page
    .getByRole("button", { name: "Record a take", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop and save", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  await page.clock.fastForward(60_000);
  await expect(page.locator(".recording-list > li")).toHaveCount(1);
  expect((await fixture(page)).stopped).toBe(1);
  expect((await stored(page))[0].seconds).toBe(60);
});

for (const locale of ["en", "fa", "ar", "tr"] as const) {
  test(`${locale} voice practice fits on phones in both appearances`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      {
        name: "lingualocal.locale",
        value: locale,
        url: "http://127.0.0.1:3100",
      },
    ]);
    await page.goto(bookPath);
    await seedTakes(page, 1);
    await open(page, locale);
    await expect(page.locator(".recording-list > li")).toHaveCount(1);
    for (const appearance of ["light", "dark"]) {
      await page
        .locator("html")
        .evaluate(
          (html, value) => html.setAttribute("data-appearance", value),
          appearance,
        );
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  });
}

test("unsupported recording remains optional and never requests the microphone", async ({
  page,
}) => {
  await microphone(page);
  await page.addInitScript(() =>
    Object.defineProperty(window, "MediaRecorder", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto(bookPath);
  await open(page);
  await page
    .getByRole("button", { name: "Record a take", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Voice recording needs HTTPS" }),
  ).toBeVisible();
  expect((await fixture(page)).calls).toBe(0);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }).first(),
  ).toBeVisible();
});
