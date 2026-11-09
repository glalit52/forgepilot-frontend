import { expect, test } from "@playwright/test";
import { failOnConsoleErrors, signInAs } from "./helpers";

// FE-08 journey: "client approver approves a PR" — ≤3 clicks from the Approvals list.
test("client approver approves a PR from the Approvals list", async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await page.goto("/login");
  await page.getByTestId("login-u_priya").click(); // sign in (not counted)
  await expect(page).toHaveURL(/\/portal$/);
  await page.request.post("/api/mock/demo/reset", { data: {} });

  await page.goto("/portal/approvals");
  const approve = page.getByRole("button", { name: "Approve PR #409" });
  await expect(approve).toBeVisible();

  // Click 1: Approve.
  await approve.click();
  const dialog = page.getByRole("dialog");
  // Confirm dialog shows tests passed and the engineer's sign-off by name.
  await expect(dialog).toContainText(/tests passed/i);
  await expect(dialog).toContainText(/Arjun Rao/);
  // Click 2: Confirm.
  await dialog.getByRole("button", { name: "Confirm approval" }).click();

  await expect(page.getByText(/Approved/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve PR #409" })).toHaveCount(0);

  // Approval appended an EvidenceRecord, attributed to the person.
  await page.goto("/portal/work/task_010");
  await expect(page.getByText("Client approved").first()).toBeVisible();
  await expect(page.getByText("Priya Shah").first()).toBeVisible();
  noErrors();
});

test("viewer role sees no approve buttons", async ({ page }) => {
  await signInAs(page, "u_neha");
  await page.goto("/portal/approvals");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Approve/ })).toHaveCount(0);
});

test("approvals are usable on a 390px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, "u_priya");
  await page.goto("/portal/approvals");
  const approve = page.getByRole("button", { name: "Approve PR #409" });
  await expect(approve).toBeVisible();
  await approve.click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm approval" }).click();
  await expect(page.getByText(/Approved/).first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
});
