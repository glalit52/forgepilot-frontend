import { expect, test } from "@playwright/test";
import { signInAs, watchErrors } from "./helpers";

const PAGES = [
  "/app",
  "/app/projects",
  "/app/projects/proj_web",
  "/app/repositories/repo_web",
  "/app/devpilot",
  "/app/devpilot/tasks",
  "/app/devpilot/tasks/task_001",
  "/app/devpilot/sessions",
  "/app/devpilot/sessions/sess_002_1",
  "/app/devpilot/workspaces",
  "/app/shipsafe",
  "/app/shipsafe/suites",
  "/app/shipsafe/runs",
  "/app/shipsafe/bugs",
  "/app/shipsafe/bugs/bug_002",
  "/app/codekeeper",
  "/app/codekeeper/dependencies",
  "/app/codekeeper/findings",
  "/app/codekeeper/maintenance",
  "/app/pull-requests",
  "/app/pull-requests/pr_h1",
  "/app/approvals",
  "/app/analytics",
  "/app/integrations",
  "/app/settings",
  "/app/settings?tab=members",
  "/app/settings?tab=policies",
  "/app/settings?tab=audit",
  "/app/billing",
];

// Every screen renders a heading with no console errors, in light and dark.
for (const scheme of ["light", "dark"] as const) {
  test(`every app screen renders without errors (${scheme})`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: scheme });
    await signInAs(page, "u_maya", "ws_lumen");
    const noErrors = watchErrors(page);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible({ timeout: 15_000 });
    }
    noErrors();
  });
}

test("public pages render", async ({ page }) => {
  const noErrors = watchErrors(page);
  for (const path of [
    "/",
    "/pricing",
    "/security",
    "/docs",
    "/login",
    "/signup",
    "/dev/components",
  ]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
  }
  noErrors();
});
