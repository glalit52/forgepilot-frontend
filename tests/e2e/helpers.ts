import { expect, type Page } from "@playwright/test";

const ROLE: Record<string, string> = {
  u_ravi: "client_admin",
  u_priya: "client_approver",
  u_neha: "client_viewer",
  u_arjun: "fp_engineer",
  u_kabir: "fp_manager",
};

/** Sign in as a mock persona by setting the session cookies, and reset demo data. */
export async function signInAs(page: Page, userId: keyof typeof ROLE) {
  const url = `http://localhost:${process.env.E2E_PORT ?? 3100}`;
  await page.context().addCookies([
    { name: "fp_session", value: userId, url },
    { name: "fp_role", value: ROLE[userId], url },
  ]);
  const res = await page.request.post("/api/mock/demo/reset", { data: {} });
  expect(res.ok()).toBeTruthy();
}

/** Fail the test on any uncaught page error or console error (FE-18: no console errors). */
export function failOnConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return () => expect(errors, errors.join("\n")).toEqual([]);
}
