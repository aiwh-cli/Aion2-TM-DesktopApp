import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const output = process.env.QA_OUTPUT || "../browser-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1040 },
  acceptDownloads: true,
  timezoneId: "Australia/Brisbane",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const passed = [];
const base = process.env.APP_URL || "http://127.0.0.1:5173";
async function nav(name) {
  if (
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: name !== "Tasks" })
    .click();
}
async function checkpoint(name) {
  expect(errors, `No uncaught errors at ${name}`).toEqual([]);
  passed.push(name);
  console.log("PASS", name);
}
try {
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "Ready for what’s next." }),
  ).toBeVisible();
  await page.screenshot({
    path: join(output, "overview-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await nav("Tasks");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task name", { exact: true }).fill("Browser QA daily");
  await page.getByLabel("Notes", { exact: true }).fill("Persistence check");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete Browser QA daily", exact: true })
    .click();
  await page.reload();
  await nav("Tasks");
  await expect(
    page.getByRole("button", { name: "Reopen Browser QA daily", exact: true }),
  ).toBeVisible();
  await checkpoint("task create, complete, reload persistence");
  await nav("Shopping list");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Item name", { exact: true }).fill("QA Ore");
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await page.getByLabel("Unit price", { exact: true }).fill("150");
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(
    page.locator(".entry-row").filter({ hasText: "QA Ore" }),
  ).toContainText("450");
  await checkpoint("shopping quantity and unit-price total");
  await nav("Event timers");
  await page.getByRole("button", { name: "Add timer", exact: true }).click();
  await page.getByLabel("Timer name", { exact: true }).fill("QA countdown");
  await page.getByLabel("Duration (minutes)", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Save timer", exact: true }).click();
  await page
    .getByRole("button", { name: "Start QA countdown", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause QA countdown", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause QA countdown", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start QA countdown", exact: true }),
  ).toBeVisible();
  await checkpoint("countdown create, start and pause");
  await nav("Flow map");
  await page.getByRole("button", { name: "New map", exact: true }).click();
  await page.getByLabel("Map name", { exact: true }).fill("QA map");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await page.getByRole("button", { name: "Add step", exact: true }).click();
  await page.getByLabel("Step title", { exact: true }).fill("QA first step");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("active");
  await page.getByRole("button", { name: "Add step", exact: true }).click();
  await page.getByLabel("Step title", { exact: true }).fill("QA second step");
  await page
    .getByRole("combobox", { name: "Connect to next step", exact: true })
    .selectOption({ label: "QA first step" });
  await page.getByRole("button", { name: "Connect step", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Disconnect QA first step", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "QA second step" }),
  ).toBeVisible();
  await checkpoint("flow map create, connect and guide");
  await nav("Item database");
  await page
    .getByPlaceholder("Search the catalog")
    .fill("Noble Dragon Lord Greatsword");
  await page.locator(".armory-row").first().click();
  await expect(page.locator(".armory h2")).toHaveText(
    "Noble Dragon Lord Greatsword",
  );
  await page
    .getByRole("button", { name: /compare/i })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Item comparison" }),
  ).toBeVisible();
  await checkpoint("real item catalog search, details and comparison");
  await nav("Crafting calculator");
  await page.getByLabel("Find a recipe", { exact: true }).fill("Dragon");
  await page.locator(".armory-row").first().click();
  await page.getByLabel("Output quantity", { exact: true }).fill("2");
  await expect(
    page.getByRole("heading", { name: /estimated total/ }),
  ).toBeVisible();
  const countBefore = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("aion2-companion-v1")).profiles[0].tasks
        .shopping.length,
  );
  await page
    .getByRole("button", { name: "Add materials to shopping", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("aion2-companion-v1")).profiles[0]
            .tasks.shopping.length,
      ),
    )
    .toBeGreaterThan(countBefore);
  await checkpoint("craft recursive materials and shopping integration");
  await nav("Build planner");
  await page.getByLabel("Loadout name", { exact: true }).fill("QA build");
  const weapons = page.getByRole("combobox", { name: "Weapon", exact: true });
  await expect(weapons.locator("option")).not.toHaveCount(1);
  const weaponId = await weapons.locator("option").nth(1).getAttribute("value");
  await weapons.selectOption(weaponId);
  await expect(
    page.getByRole("heading", { name: "Loadout properties", exact: true }),
  ).toBeVisible();
  await checkpoint("named build with valid class equipment");
  await nav("Skill planner");
  const invested = page.getByLabel("Invested level", { exact: true }).first();
  await invested.fill("5");
  await expect(invested).toHaveValue("5");
  await page
    .getByRole("button", { name: /^Favorite / })
    .first()
    .click();
  await checkpoint("skill investment and favorites");
  await nav("Daevanion boards");
  await expect(page.locator(".armory-node").first()).toBeVisible();
  const node = page
    .locator(".armory-node")
    .filter({ hasText: /[1-9]/ })
    .first();
  await node.click();
  const route = page.getByRole("button", {
    name: "Add connected path",
    exact: true,
  });
  if (await route.isEnabled()) await route.click();
  await expect(
    page.getByRole("heading", { name: "Selected bonuses" }),
  ).toBeVisible();
  await checkpoint("Daevanion real board and connected route");
  await nav("Arcana");
  await expect(
    page.getByRole("heading", { name: "Chalice", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Chalice theme", exact: true })
    .selectOption("Magic");
  await page
    .getByRole("button", { name: "Calculate best-case cards", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /requested levels covered/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply calculated cards", exact: true })
    .click();
  await checkpoint("Arcana five-card planner and calculator");
  await nav("Settings & profiles");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export profile", exact: true })
    .click();
  const dl = await downloadPromise;
  const exported = await readFile(await dl.path(), "utf8");
  const data = JSON.parse(exported);
  expect(
    data.tasks.tasks.some((x) => x.title === "Browser QA daily" && x.completed),
  ).toBe(true);
  expect(data.web_armory.builds[0].name).toBe("QA build");
  expect(data.flow_maps["QA map"]).toBeTruthy();
  await page.locator("input[type=file]").setInputFiles({
    name: "qa-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await expect(page.getByRole("status")).toContainText("Imported 1 profile");
  await expect(
    page.getByLabel("Current profile").locator("option"),
  ).toHaveCount(2);
  await checkpoint("profile export/import round trip including planners");
  await page.setViewportSize({ width: 1440, height: 1040 });
  await nav("Item database");
  await page.screenshot({
    path: join(output, "items-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await nav("Build planner");
  await page.screenshot({
    path: join(output, "build-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await writeFile(
    join(output, "results.json"),
    JSON.stringify({ passed, errors, date: new Date().toISOString() }, null, 2),
  );
  console.log(`${passed.length} browser scenarios passed.`);
} catch (error) {
  await page.screenshot({
    path: join(output, "failure.png"),
    fullPage: true,
    animations: "disabled",
  });
  console.error(error);
  console.error("Page errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
