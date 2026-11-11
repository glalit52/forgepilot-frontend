import { expect, test } from "@playwright/test";
import { signInAs, watchErrors } from "./helpers";

// PRD §6.4 + §6.5: delegate → agent PR → ShipSafe fails → fix task → retest passes → human review → merge in GitHub.
test("closed loop: failing verification becomes a fix task, retest passes, human merges", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const noErrors = watchErrors(page);
  await signInAs(page, "u_maya", "ws_lumen");

  await page.goto("/app/devpilot/tasks?new=1");
  const form = page.getByRole("form", { name: "New task" });
  await form.getByLabel("Title").fill("Persist table density preference");
  await form.getByLabel("Repository").click();
  await page.getByRole("option", { name: "lumen/web-app" }).click();
  await form
    .getByLabel("Goal and context")
    .fill(
      "Users lose their compact/comfortable table density choice after reload. Store it per user.",
    );
  await form.getByLabel("Acceptance criterion 1").fill("Density persists after reload");
  await form.getByLabel("Acceptance criterion 2").fill("E2E test covers both densities");
  await form.getByLabel("Launch the agent now").uncheck();
  await form.getByRole("button", { name: "Save draft" }).click();

  await expect(page).toHaveURL(/\/app\/devpilot\/tasks\/task_/);
  await page.getByLabel("Simulate verification failure (demo)").check();
  await page.getByRole("button", { name: "Launch agent" }).click();

  // Verification fails with a product defect → fix task
  const fix = page.getByRole("button", { name: "Create fix task" }).first();
  await expect(fix).toBeVisible({ timeout: 40_000 });
  await fix.click();
  await page.waitForURL(/\/app\/devpilot\/tasks\/task_/);
  await expect(page.getByText("Ready for review").first()).toBeVisible({ timeout: 40_000 });

  // Human review + merge happen in GitHub (simulated)
  await page.getByRole("link", { name: /#\d+/ }).first().click();
  await expect(page).toHaveURL(/\/app\/pull-requests\//);
  const merge = page.getByRole("button", { name: "Simulate GitHub merge (demo)" });
  await expect(merge).toBeDisabled();
  await page.getByRole("button", { name: "Approve PR" }).click();
  // The change touched the UI, so a screenshot changed: still blocked until a person approves the new baseline.
  await expect(merge).toBeDisabled();
  await page
    .getByRole("button", { name: /^Approve new baseline/ })
    .first()
    .click();
  await expect(merge).toBeEnabled();
  await merge.click();
  await expect(page.getByText(/Merged/).first()).toBeVisible();
  noErrors();
});
