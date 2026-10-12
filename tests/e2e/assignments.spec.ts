import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import plan from "../../examples/assignment.json";
import { createHash } from "node:crypto";
import { emptyProgress } from "../../src/lib/learning";
import { encodeAssignment } from "../../src/lib/assignments";
import { translate, locales } from "../../src/lib/locale";
const route = `/assignment?plan=${encodeURIComponent(encodeAssignment(plan))}`;

test("assignment checklists stay private, sync across tabs and travel with backups", async ({
  page,
  context,
}) => {
  await page.goto(route);
  await page
    .getByRole("checkbox", { name: "Complete curious", exact: true })
    .check();
  await expect(
    page.getByRole("heading", { name: "1 of 3 complete", exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto(route);
  await expect(
    other.getByRole("checkbox", { name: "Complete curious", exact: true }),
  ).toBeChecked();
  await other
    .getByRole("checkbox", {
      name: "Complete Everyday habits, simple sentences",
      exact: true,
    })
    .check();
  await expect(
    page.getByRole("heading", { name: "2 of 3 complete", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "curious", exact: true }).click();
  await expect(page.locator(".word-card h2")).toHaveText("curious");
  await page.goto("/progress");
  await page.locator(".assignment-history > summary").click();
  await page.getByRole("link", { name: plan.title, exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Complete curious", exact: true }),
  ).toBeChecked();
  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export my progress", exact: true })
    .click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(
    Object.values<{ checked: string[] }>(backup.assignments)[0].checked,
  ).toEqual(["word/curious", "lesson/present-simple"]);
  await page.goto("/progress");
  await page.locator(".assignment-history > summary").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", {
      name: `Remove checklist for ${plan.title}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("link", { name: plan.title, exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: `Remove checklist for ${plan.title}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Progress", exact: true }),
  ).toBeFocused();
  await expect(
    other.getByRole("checkbox", { name: "Complete curious", exact: true }),
  ).not.toBeChecked();
});

test("invalid links and stale curriculum tasks stay usable", async ({
  page,
}) => {
  await page.goto("/assignment?plan=broken");
  await expect(
    page.getByRole("heading", {
      name: "This assignment link is unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(
    `/assignment?plan=${encodeURIComponent(encodeAssignment({ ...plan, due: "2020-01-01", tasks: [{ kind: "lesson", id: "removed-lesson" }] }))}`,
  );
  await expect(
    page.getByText("No longer in this collection", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByText(/Was due/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No available tasks", exact: true }),
  ).toBeVisible();
});

for (const locale of locales)
  test(`${locale} assignment pages fit mobile and support both appearances`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "lingualocal.locale",
        value: locale,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [route, "/assignment"]) {
      await page.goto(path);
      for (const appearance of ["light", "dark"]) {
        await page
          .locator("html")
          .evaluate(
            (html, value) => html.setAttribute("data-appearance", value),
            appearance,
          );
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
    await page.goto(route);
    await page
      .getByRole("checkbox", {
        name: translate(locale, "Complete {title}", { title: "curious" }),
        exact: true,
      })
      .focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("checkbox", {
        name: translate(locale, "Complete {title}", { title: "curious" }),
        exact: true,
      }),
    ).toBeChecked();
  });

test("due dates update at midnight using the student calendar", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2020, 0, 1, 23, 59, 30) });
  await page.goto(
    `/assignment?plan=${encodeURIComponent(encodeAssignment({ ...plan, due: "2020-01-01" }))}`,
  );
  await expect(page.locator("time")).toContainText("Due ");
  await page.clock.fastForward(60000);
  await expect(page.locator("time")).toContainText("Was due ");
});

test("unchecking a removed task keeps keyboard focus on the checklist", async ({
  page,
}) => {
  const removed = {
    ...plan,
    tasks: [{ kind: "lesson", id: "removed-lesson" }],
  };
  const encoded = encodeAssignment(removed);
  const id = createHash("sha256").update(encoded).digest("hex");
  await page.goto("/assignment");
  await page.evaluate(
    (progress) =>
      localStorage.setItem("lingualocal.progress.v1", JSON.stringify(progress)),
    {
      ...emptyProgress,
      assignments: {
        [id]: {
          title: plan.title,
          tasks: ["lesson/removed-lesson"],
          checked: ["lesson/removed-lesson"],
        },
      },
    },
  );
  await page.goto(`/assignment?plan=${encodeURIComponent(encoded)}`);
  await page.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("heading", { name: "No available tasks", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});
