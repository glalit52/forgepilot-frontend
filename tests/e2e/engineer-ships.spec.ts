import { expect, test } from "@playwright/test";
import { failOnConsoleErrors, signInAs } from "./helpers";

// FE-10 journey: "engineer launches agent → verification passes → signs off → PR opens".
test("engineer launches agent, verification passes, signs off and opens a PR", async ({ page }) => {
  test.setTimeout(90_000);
  const noErrors = failOnConsoleErrors(page);
  await signInAs(page, "u_arjun");
  await page.goto("/console/tasks/task_003");

  const signOff = page.getByRole("button", { name: "Sign off" });
  await page.getByRole("button", { name: "Launch agent" }).click();

  // Live log streams while the agent runs.
  await expect(page.getByText(/Sandbox ready/).first()).toBeVisible();
  // Sign-off is impossible before verification passes.
  await expect(signOff).toBeDisabled();

  await expect(page.getByText("Verification passed").first()).toBeVisible({ timeout: 30_000 });

  // Still impossible until "I reviewed the diff" is ticked.
  await expect(signOff).toBeDisabled();
  await page.getByLabel("I reviewed the diff").check();
  await expect(signOff).toBeEnabled();
  await signOff.click();

  await page.getByRole("button", { name: "Open PR" }).click();
  await expect(page.getByText("PR open").first()).toBeVisible();

  // Every action is in the evidence trail with the right actor.
  await page.getByRole("tab", { name: /Evidence/ }).click();
  await expect(page.getByText("Engineer signed off").first()).toBeVisible();
  await expect(page.getByText("Pull request opened").first()).toBeVisible();
  await expect(page.getByText(/Hash chain intact/)).toBeVisible();
  noErrors();
});

test("command palette opens with Ctrl+K and creates a new task", async ({ page }) => {
  await signInAs(page, "u_arjun");
  await page.goto("/console");
  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  await palette.getByRole("option", { name: /New task/ }).click();
  const form = page.getByRole("form", { name: "New task" });
  // Zod validation blocks an empty form.
  await form.getByRole("button", { name: "Create task" }).click();
  await expect(form.getByText("Choose a client")).toBeVisible();
});
