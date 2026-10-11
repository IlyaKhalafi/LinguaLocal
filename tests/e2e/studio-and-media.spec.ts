import { test, expect } from "@playwright/test";
import seed from "../../src/content/starter.json";

test("studio drafts survive reloads and publish books, words, and lessons", async ({
  page,
  request,
}) => {
  const initial = await (await request.get("/api/content")).json();
  try {
    await page.goto("/studio");
    await page.getByRole("button", { name: "Add book", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Book title", exact: true })
      .fill("Classroom stories");
    await page
      .getByRole("textbox", { name: "Cover subtitle" })
      .fill("Stories we share");
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("Original stories for our class.");
    await expect(
      page.getByRole("button", { name: "Dictionary words", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Save collection", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Keep book in draft" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.reload();
    await page.getByRole("button", { name: "Restore my draft" }).click();
    await page
      .getByRole("button", { name: "Save collection", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("ready to explore");
    await page
      .getByRole("button", { name: "Dictionary words", exact: true })
      .click();
    await page.getByRole("button", { name: "Add word", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Word", exact: true })
      .fill("classroom");
    await page
      .getByRole("textbox", { name: "Definition", exact: true })
      .fill("A room in which students learn.");
    await page
      .getByRole("textbox", { name: "Example sentence" })
      .fill("Our classroom has a bookshelf.");
    await page
      .getByRole("textbox", { name: "Synonyms separated by commas" })
      .fill("schoolroom, learning space");
    await page.getByRole("button", { name: "Keep word in draft" }).click();
    await page.getByRole("button", { name: "Lessons", exact: true }).click();
    await page.getByRole("button", { name: "Add lesson", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Lesson title", exact: true })
      .fill("A classroom of words");
    await page
      .getByRole("textbox", { name: "Lesson description" })
      .fill("Learn together.");
    await page
      .getByRole("textbox", { name: "Section 1 title" })
      .fill("Get started");
    await page
      .getByRole("textbox", { name: "Section 1 text" })
      .fill("A classroom is a place to learn together.");
    await page
      .getByRole("textbox", { name: "Practice question" })
      .fill("Where do students learn?");
    await page
      .getByRole("textbox", { name: "Answer option 1" })
      .fill("In a classroom");
    await page
      .getByRole("textbox", { name: "Answer option 2" })
      .fill("In a garden");
    await page
      .getByRole("textbox", { name: "Answer option 3" })
      .fill("At a bus stop");
    await page
      .getByRole("textbox", { name: "Answer explanation" })
      .fill("Classrooms are built for learning.");
    await page.getByRole("button", { name: "Keep lesson in draft" }).click();
    await page
      .getByRole("button", { name: "Save collection", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("ready to explore");
    const content = await (await request.get("/api/content")).json();
    expect(
      content.words.find((w: { word: string }) => w.word === "classroom")
        .synonyms,
    ).toEqual(["schoolroom", "learning space"]);
    await page.goto("/library/classroom-stories");
    await expect(page.locator("h1:visible")).toHaveText("Classroom stories");
    await page.goto("/lessons/a-classroom-of-words");
    await expect(page.locator("h1:visible")).toHaveText("A classroom of words");
    await page.goto("/studio");
    await page
      .getByRole("button", { name: "Dictionary words", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove classroom", exact: true })
      .click();
    await page.getByRole("button", { name: "Keep word", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove classroom", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Remove classroom", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove word", exact: true })
      .click();
    await page.getByRole("button", { name: "Lessons", exact: true }).click();
    await page
      .getByRole("button", { name: "Remove A classroom of words", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove lesson", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save collection", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("ready to explore");
    const after = await (await request.get("/api/content")).json();
    expect(
      after.words.some((item: { id: string }) => item.id === "classroom"),
    ).toBe(false);
    expect(
      after.lessons.some(
        (item: { id: string }) => item.id === "a-classroom-of-words",
      ),
    ).toBe(false);
  } finally {
    await request.put("/api/content", { data: initial });
  }
});

test("memory-only studio drafts warn before navigation and media uploads show keyboard focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage is unavailable");
      },
    });
  });
  await page.goto("/studio");
  await page.getByRole("button", { name: "Media files", exact: true }).click();
  await page.locator("#studio-upload").focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  expect(
    await page
      .locator(".upload-control")
      .evaluate((label) => getComputedStyle(label).outlineStyle),
  ).toBe("solid");
  await page
    .getByRole("button", { name: "Dictionary words", exact: true })
    .click();
  await page
    .locator(".studio-row")
    .first()
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Definition", exact: true })
    .fill("A definition kept in memory.");
  await page
    .getByRole("button", { name: "Keep word in draft", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your draft" }),
  ).toContainText("in memory");
  await page.getByRole("button", { name: "Media files", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.locator("a[download]").first().click();
  expect((await download).suggestedFilename()).toBeTruthy();
  await expect(page).toHaveURL(/\/studio$/);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Book library", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("link", { name: "Book library", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
});

test("stale studio saves keep their draft and return a useful conflict", async ({
  page,
  request,
}) => {
  const initial = await (await request.get("/api/content")).json();
  try {
    await page.goto("/studio");
    await page.getByRole("button", { name: "Add book", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Book title", exact: true })
      .fill("Unsaved classroom book");
    await page
      .getByRole("textbox", { name: "Cover subtitle" })
      .fill("Our next chapter");
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("A draft we want to keep.");
    await page.getByRole("button", { name: "Keep book in draft" }).click();
    const other = structuredClone(initial);
    other.books[0].title = "Changed in another browser";
    await request.put("/api/content", { data: other });
    await page
      .getByRole("button", { name: "Save collection", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "changed in another browser",
    );
    expect(
      await page.evaluate(() =>
        localStorage.getItem("lingualocal.studio-draft.v1"),
      ),
    ).toContain("Unsaved classroom book");
  } finally {
    await request.put("/api/content", { data: initial });
  }
});

test("video captions, playback speed, and passage loops work", async ({
  page,
}) => {
  await page.goto("/library/everyday-english");
  await page.getByRole("button", { name: "Watching", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator("video")).toHaveAttribute("playsinline", "");
  await page.waitForFunction(() => !!document.querySelector("video")?.duration);
  await page.getByLabel("Playback speed").selectOption("0.75");
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.playbackRate),
  ).toBe(0.75);
  await page.evaluate(async () => {
    const v = document.querySelector("video")!;
    await v.play();
    v.currentTime = 2;
  });
  await page.getByRole("button", { name: /Set loop start/ }).click();
  await page.evaluate(() => {
    document.querySelector("video")!.currentTime = 5;
  });
  await page.getByRole("button", { name: /Set loop end/ }).click();
  await page.evaluate(() => {
    const v = document.querySelector("video")!;
    v.currentTime = 7;
    v.dispatchEvent(new Event("timeupdate"));
  });
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.currentTime),
  ).toBeLessThan(4);
  await page
    .getByRole("button", { name: "Show captions", exact: true })
    .click();
  await page.waitForFunction(() => {
    const v = document.querySelector("video")!;
    return v.textTracks[0]?.cues?.length === 3;
  });
  await page.evaluate(() => {
    document.querySelector("video")!.playbackRate = 1.5;
  });
  await expect(page.getByLabel("Playback speed")).toHaveValue("1.5");
  const results = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => ({
      ready: v.readyState,
      captions: v.textTracks[0].cues!.length,
    }));
  expect(results.captions).toBe(3);
});

test("uploads handle language-specific names and reject unexpected requests", async ({
  request,
}) => {
  const file = await request.post(
    "/api/upload?name=" + encodeURIComponent("تمرین انگلیسی.pdf"),
    {
      headers: { "X-LinguaLocal-Upload": "1" },
      data: Buffer.from("%PDF-1.4\nlocal worksheet"),
    },
  );
  expect(file.ok()).toBe(true);
  expect((await file.json()).file).toMatch(/media\.pdf$/);
  expect(
    (
      await request.post("/api/upload?name=test.pdf", { data: "unexpected" })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/upload?name=test.pdf", {
        headers: {
          Origin: "http://another-site.invalid",
          "X-LinguaLocal-Upload": "1",
        },
        data: "unexpected",
      })
    ).status(),
  ).toBe(403);
  const collection = await request.get("/api/content");
  const version = collection.headers().etag;
  expect(
    (
      await request.put("/api/content", {
        headers: { "If-Match": '"stale"' },
        data: seed,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.put("/api/content", {
        headers: { "If-Match": version },
        data: await collection.json(),
      })
    ).status(),
  ).toBe(200);
});
