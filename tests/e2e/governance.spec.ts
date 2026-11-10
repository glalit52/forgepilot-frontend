import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test("an admin approves an agent's protected-path request and the session resumes", async ({
  page,
}) => {
  await signInAs(page, "u_dev", "ws_lumen");
  await page.goto("/app/approvals");
  const card = page
    .getByRole("article")
    .filter({ hasText: "migrations/0042_payouts_status_idx.py" })
    .first();
  await card.getByRole("button", { name: "Approve" }).click();
  const confirm = page.getByRole("button", { name: "Confirm approval" });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await expect(page.getByText(/approved/i).first()).toBeVisible();
  const task = await page.request.get("/api/mock/tasks/task_004");
  expect((await task.json()).task.status).toBe("running");
});

test("members can't decide approvals; viewers can't launch agents", async ({ page }) => {
  await signInAs(page, "u_alex", "ws_lumen");
  await page.goto("/app/approvals");
  await expect(page.getByRole("button", { name: "Approve" }).first()).toBeDisabled();

  await signInAs(page, "u_jordan", "ws_lumen");
  await page.goto("/app/devpilot/tasks/task_013");
  await expect(page.getByRole("button", { name: "Launch agent" })).toBeDisabled();
});

test("signed-out visitors are sent to sign in; workspaces switch from the switcher", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await signInAs(page, "u_maya", "ws_lumen");
  await page.goto("/app");
  await page.getByRole("button", { name: /Workspace: Lumen Labs/ }).click();
  await page.getByRole("menuitem", { name: /Maya's sandbox/ }).click();
  await expect(page.getByRole("button", { name: /Workspace: Maya's sandbox/ })).toBeVisible();
});

test("the owner upgrades the plan from billing", async ({ page }) => {
  await signInAs(page, "u_maya", "ws_lumen");
  await page.goto("/app/billing");
  await page.getByRole("button", { name: "Change plan" }).first().click();
  await page.getByRole("button", { name: "Choose Business" }).click();
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByText("Business").first()).toBeVisible();
  const billing = await page.request.get("/api/mock/billing");
  expect((await billing.json()).plan).toBe("business");
});

test("approvals and the overview work on a 390px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, "u_dev", "ws_lumen");
  for (const path of ["/app", "/app/approvals"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false);
  }
});
