/**
 * FE-02 AC: colour tokens pass WCAG AA (4.5:1 for text) in light AND dark.
 * Parses app/globals.css and converts oklch → sRGB → relative luminance.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

function block(selectorStart: string) {
  const i = css.indexOf(selectorStart);
  const open = css.indexOf("{", i);
  const close = css.indexOf("}", open);
  const vars: Record<string, string> = {};
  css
    .slice(open + 1, close)
    .split(";")
    .forEach((decl) => {
      const m = decl.match(/--([\w-]+):\s*(.+)/);
      if (m) vars[m[1]] = m[2].trim();
    });
  return vars;
}

function oklchToLuminance(value: string) {
  const m = value.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\)/);
  if (!m) throw new Error(`not oklch: ${value}`);
  const [L, C, H] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180];
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const R = clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s);
  const G = clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s);
  const B = clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(a: string, b: string) {
  const [la, lb] = [oklchToLuminance(a), oklchToLuminance(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

const PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["card-foreground", "card"],
  ["muted-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["success-foreground", "success-soft"],
  ["warning-foreground", "warning-soft"],
  ["danger-foreground", "danger-soft"],
  ["neutral-foreground", "neutral-soft"],
  ["info-foreground", "info-soft"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["primary", "background"],
];

describe.each([
  ["light", block(":root")],
  ["dark", block(".dark {")],
])("%s theme", (_name, vars) => {
  it.each(PAIRS)("%s on %s meets WCAG AA (4.5:1)", (fg, bg) => {
    expect(vars[fg], `--${fg} missing`).toBeDefined();
    expect(vars[bg], `--${bg} missing`).toBeDefined();
    expect(contrast(vars[fg], vars[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
