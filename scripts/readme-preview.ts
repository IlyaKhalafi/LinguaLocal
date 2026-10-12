import path from "node:path";
import { chromium } from "@playwright/test";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1040 },
      colorScheme: "light",
    });
    await page.goto("https://github.com/IlyaKhalafi/LinguaLocal", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    const article = page.locator("article.markdown-body");
    await article.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await article.evaluate(async (element) => {
      const images = [...element.querySelectorAll("img")];
      await Promise.all(
        images.map((image) => {
          image.loading = "eager";
          return image.decode();
        }),
      );
      // Floating repository controls must not cover the captured document.
      for (const node of document.querySelectorAll<HTMLElement>("body *")) {
        if (element.contains(node)) continue;
        const position = getComputedStyle(node).position;
        if (position === "sticky" || position === "fixed")
          node.style.setProperty("position", "static", "important");
      }
      window.scrollTo(0, 0);
    });
    await article.screenshot({ path: path.resolve("docs/readme-preview.png") });
    console.log("Captured the published README");
  } finally {
    await browser.close();
  }
});
