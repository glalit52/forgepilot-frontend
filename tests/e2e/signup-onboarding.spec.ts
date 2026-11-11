import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

// PRD Journey A: first-time developer onboarding → first useful result.
test("a new developer signs up, connects a repo and gets a first verified result", async ({
  page,
}) => {
  const noErrors = watchErrors(page);
  await page.request.post("/api/mock/demo/reset", { data: {} });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ForgePilot makes it shippable",
  );
  await page.getByRole("link", { name: "Start free" }).first().click();

  await page.getByLabel("Full name").fill("Robin Ortiz");
  await page.getByLabel("Work email").fill(`robin+${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // 1. Workspace
  await page.getByLabel("Workspace name").fill("Ortiz Labs");
  await page.getByRole("radio", { name: /My team/ }).click();
  await page.getByRole("button", { name: "Create workspace" }).click();

  // 2. GitHub App — permissions are explained before installing
  await expect(page.getByText("cannot merge")).toBeVisible();
  await page.getByRole("button", { name: "Install GitHub App" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Install & authorize" }).click();

  // 3. Repositories
  await page.getByLabel(/web-app/).check();
  await page.getByRole("button", { name: /Connect 1 repository/ }).click();

  // 4. Discovery
  await expect(page.getByRole("button", { name: "Confirm configuration" })).toBeEnabled({
    timeout: 20_000,
  });
  await expect(page.getByLabel("Test commands (comma-separated)")).toHaveValue(/test/);
  await page.getByRole("button", { name: "Confirm configuration" }).click();

  // 5. First run
  await page.getByRole("button", { name: "Run verification" }).click();
  await expect(page.getByText("Your first result is ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Time to first value/)).toBeVisible();
  await page.getByRole("button", { name: "Go to dashboard" }).click();
  await expect(page).toHaveURL(/\/app$/);
  noErrors();
});
