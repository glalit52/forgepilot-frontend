import { expect, type Page } from "@playwright/test";

export const BASE = `http://localhost:${process.env.E2E_PORT ?? 3100}`;

/** Sign in as a demo persona by cookie and reset the demo data. */
export async function signInAs(page: Page, userId: string, workspace: string) {
  await page.context().addCookies([
    { name: "fp_session", value: userId, url: BASE },
    { name: "fp_ws", value: workspace, url: BASE },
  ]);
  const res = await page.request.post("/api/mock/demo/reset", { data: {} });
  expect(res.ok()).toBeTruthy();
}

/** Collect uncaught errors and console errors; assert none at the end of a journey. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}
