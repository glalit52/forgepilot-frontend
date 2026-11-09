import { expect, test } from "@playwright/test";
import { failOnConsoleErrors, signInAs } from "./helpers";

// FE-14 journey: "new client onboards and sees health report".
test("new client onboards and sees the health report", async ({ page }) => {
  test.setTimeout(90_000);
  const noErrors = failOnConsoleErrors(page);
  await signInAs(page, "u_ravi");
  await page.goto("/portal/onboarding");

  // 1. Company — validation first.
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Enter the company name")).toBeVisible();
  await page.getByLabel("Company name").fill("Northwind Bank");
  await page.getByLabel("Industry").click();
  await page.getByRole("option", { name: "Banking" }).click();
  await page.getByLabel("Region").click();
  await page.getByRole("option", { name: "United Kingdom" }).click();
  await page.getByLabel("Primary contact").fill("Alex Morgan");
  await page.getByLabel("Contact email").fill("alex@northwind.example");
  await page.getByRole("button", { name: "Next" }).click();

  // 2. Connect Git (mock OAuth).
  await page.getByRole("radio", { name: /GitHub/ }).click();
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Authorize" }).click();
  await expect(page.getByText("Connected").first()).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // 3. Select repositories.
  await page.getByLabel(/core-banking-api/).check();
  await page.getByLabel(/customer-portal-web/).check();
  await page.getByRole("button", { name: "Next" }).click();

  // 4. Map to applications.
  await expect(
    page.getByRole("heading", { name: "Map repositories to applications" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // 5. Confirm SLA tier.
  await page.getByRole("radio", { name: "Maintain + Assure" }).click();
  await page.getByRole("button", { name: "Confirm and start health scan" }).click();

  // 6. Scan running → health report ready.
  await expect(page.getByText("Health scan running")).toBeVisible();
  await expect(page.getByTestId("health-report")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Your 90-day plan")).toBeVisible();
  await expect(page.getByText("Top findings")).toBeVisible();
  noErrors();
});
