import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

// FE-04: switching role moves you home; portal roles can't open /console and vice versa.
test("portal roles cannot open the console", async ({ page }) => {
  await signInAs(page, "u_priya");
  await page.goto("/console/tasks");
  await expect(page).toHaveURL(/\/portal/);
});

test("engineers cannot open the portal or the ops dashboard", async ({ page }) => {
  await signInAs(page, "u_arjun");
  await page.goto("/portal/approvals");
  await expect(page).toHaveURL(/\/console/);
  await page.goto("/console/ops");
  await expect(page).toHaveURL(/\/console(\?|$)/);
});

test("switching role from the user menu moves you to that role's home", async ({ page }) => {
  await signInAs(page, "u_priya");
  await page.goto("/portal");
  await page
    .getByRole("button", { name: /User menu/ })
    .first()
    .click();
  await page.getByTestId("persona-fp_manager-u_kabir").click();
  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByRole("link", { name: "Ops dashboard" })).toBeVisible();
});

test("unauthenticated visitors land on sign-in", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/login/);
});
