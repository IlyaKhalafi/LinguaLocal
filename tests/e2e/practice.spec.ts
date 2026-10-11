import { test, expect } from "@playwright/test";
import seed from "../../src/content/starter.json";
import { gapSentence } from "../../src/lib/practice";

test("spelling practice works by keyboard and records the result once", async ({
  page,
}) => {
  await page.goto("/games/practice");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  for (let index = 0; index < 8; index++) {
    const definition = await page.locator(".practice-prompt").innerText();
    const word = seed.words.find((word) => word.definition === definition)!;
    const input = page.getByLabel("Your answer", { exact: true });
    await expect(input).toBeFocused();
    await input.fill(word.word.toUpperCase());
    await input.press("Enter");
    const next = page.getByRole("button", {
      name: index === 7 ? "View result" : "Next word",
      exact: true,
    });
    await expect(next).toBeFocused();
    await expect(page.getByRole("status")).toContainText("Correct.");
    if (index === 7)
      await next.evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
    else await next.press("Enter");
  }
  await expect(
    page.getByRole("heading", { name: "Practice complete" }),
  ).toBeFocused();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lingualocal.progress.v1")!),
  );
  expect(progress.attempts).toHaveLength(1);
  expect(progress.attempts[0]).toMatchObject({
    score: 8,
    total: 8,
    title: "Spelling",
  });
});

test("gap fill accepts the omitted word and shows helpful correction", async ({
  page,
}) => {
  await page.goto("/games/practice");
  await page.getByLabel("Practice type").selectOption("gap");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  const sentence = await page.locator(".practice-prompt").innerText();
  const word = seed.words.find((word) => gapSentence(word) === sentence)!;
  expect(sentence).not.toContain(` ${word.word} `);
  await page.getByLabel("Your answer", { exact: true }).fill("wrong answer");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Incorrect.");
  await expect(page.getByRole("status")).toContainText(word.word);
});

test("listening without a local voice offers a route back to another practice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: () => {},
      },
    });
  });
  await page.goto("/games/practice");
  await page.getByLabel("Practice type").selectOption("listening");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  const listen = page.getByRole("button", { name: "Listen", exact: true });
  await listen.click();
  await expect(page.getByRole("status")).toContainText(
    "Install an English voice",
  );
  await expect(listen).toBeFocused();
  await page
    .getByRole("button", { name: "Choose another practice", exact: true })
    .click();
  await expect(page.getByLabel("Practice type")).toBeVisible();
});
