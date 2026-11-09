import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { renderContract } from "@/lib/mock/contract";

const FILE = path.join(process.cwd(), "docs/api-contract.md");

/** FE-19 AC: the contract matches lib/schemas exactly. */
it("docs/api-contract.md matches the route table and Zod schemas", () => {
  const expected = renderContract();
  if (process.env.UPDATE_CONTRACT === "1" || !existsSync(FILE)) writeFileSync(FILE, expected);
  expect(readFileSync(FILE, "utf8")).toBe(expected);
});
