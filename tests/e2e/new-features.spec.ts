import { expect, test } from "@playwright/test";
import { signInAs, watchErrors } from "./helpers";

// PRD §7.5: visual comparison with explicit baseline approval.
test("a reviewer rejects a visual change and it becomes a bug on the PR", async ({ page }) => {
  const noErrors = watchErrors(page);
  await signInAs(page, "u_maya", "ws_lumen");
  await page.goto("/app/shipsafe/visual");
  await expect(page.getByRole("heading", { level: 1, name: "Visual review" })).toBeVisible();
  const card = page
    .getByRole("article")
    .filter({ hasText: "Billing settings" })
    .filter({ hasText: "PR #" })
    .first();
  await card.getByRole("button", { name: "Swipe" }).click();
  await expect(card.getByLabel("Drag to compare")).toBeVisible();
  await card.getByRole("button", { name: /^Reject change/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Reject and file bug" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Describe what looks wrong");
  await dialog.getByLabel("What looks wrong?").fill("The save button overlaps the payment card");
  await dialog.getByRole("button", { name: "Reject and file bug" }).click();
  await expect(page.getByText("Change rejected and filed as a bug")).toBeVisible();

  await page.goto("/app/pull-requests/pr_h1");
  await expect(page.getByText(/Visual regression on Billing settings/).first()).toBeVisible();
  noErrors();
});

test("viewers can look at visual changes but not decide", async ({ page }) => {
  await signInAs(page, "u_jordan", "ws_lumen");
  await page.goto("/app/shipsafe/visual");
  await expect(page.getByRole("button", { name: /^Approve new baseline/ }).first()).toBeDisabled();
});

// DP-010: import GitHub issues as DevPilot tasks.
test("a developer imports a GitHub issue; its checklist becomes acceptance criteria", async ({
  page,
}) => {
  const noErrors = watchErrors(page);
  await signInAs(page, "u_alex", "ws_lumen");
  await page.goto("/app/devpilot/tasks");
  await page.getByRole("button", { name: "Import issues" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search issues").fill("Empty state");
  await dialog.getByRole("checkbox", { name: /Empty state for new accounts/ }).check();
  await dialog.getByRole("button", { name: "Import 1 issue" }).click();
  await expect(page).toHaveURL(/\/app\/devpilot\/tasks\/task_/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Empty state for new accounts",
  );
  await expect(page.getByRole("listitem").filter({ hasText: "Show an empty state with a CTA" }).first()).toBeVisible();
  await expect(page.getByText("Urgent").first()).toBeVisible();

  // Importing again is impossible: the issue is marked as imported.
  await page.goto("/app/devpilot/tasks?import=1");
  await page.getByRole("dialog").getByLabel("Search issues").fill("Empty state");
  await expect(
    page.getByRole("dialog").getByRole("checkbox", { name: /Empty state for new accounts/ }),
  ).toBeDisabled();
  noErrors();
});

// Live updates: the server pushes changes; screens update without a refresh.
test("live updates push a change made elsewhere onto the open screen", async ({ page }) => {
  await signInAs(page, "u_maya", "ws_lumen");
  await page.goto("/app/approvals");
  await expect(page.getByLabel("Live updates: Live")).toBeVisible({ timeout: 15_000 });
  const pending = page.getByRole("article").filter({ hasText: "api.exchangerate.example" });
  await expect(pending.getByRole("button", { name: "Approve" })).toBeVisible();
  // The request is decided through the API, outside this page (as if by a teammate).
  // While live, the page doesn't poll — only the server push can update it.
  const res = await page
    .context()
    .request.post("/api/mock/approvals/apr_002/decision", { data: { decision: "approved" } });
  expect(res.ok()).toBeTruthy();
  // Pushed within a couple of seconds, with no reload.
  await expect(pending.getByRole("button", { name: "Approve" })).toHaveCount(0, { timeout: 5_000 });
});
