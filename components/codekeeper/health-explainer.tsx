import { InfoIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthDimension } from "@/lib/schemas";
import { HEALTH_DIMENSION_LABEL, HEALTH_SCORE_VERSION, HEALTH_WEIGHTS } from "@/lib/domain/health";

const EVIDENCE: Record<HealthDimension, string> = {
  security: "Known advisories matched to installed versions",
  dependencies: "Outdated or unsupported packages, update backlog",
  buildStability: "Recent CI outcomes and recurring failures",
  tests: "Pass history, flaky rate and coverage signals",
  docs: "Presence and freshness of selected docs",
};
const ORDER: HealthDimension[] = ["security", "dependencies", "buildStability", "tests", "docs"];

/** PRD §8.5: explainable, versioned, weights visible, unknown ≠ healthy, not a certification. */
export function HealthExplainer({ version }: { version?: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="text-muted-foreground size-4" aria-hidden /> How the health score
          works
        </CardTitle>
        <CardDescription>
          Model {version ?? HEALTH_SCORE_VERSION}. A weighted average of five dimensions, each
          0–100.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2" aria-label="Health score weights">
          {ORDER.map((d) => (
            <li key={d} className="grid grid-cols-[2.5rem_1fr] items-start gap-2 text-sm">
              <span className="bg-muted rounded px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums">
                {Math.round(HEALTH_WEIGHTS[d] * 100)}%
              </span>
              <span className="min-w-0">
                <span className="font-medium">{HEALTH_DIMENSION_LABEL[d]}</span>
                <span className="text-muted-foreground block text-xs">{EVIDENCE[d]}</span>
              </span>
            </li>
          ))}
        </ul>
        <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-4 text-xs">
          <li>
            <span className="text-foreground font-medium">Unknown ≠ healthy.</span> A dimension with
            no data is shown as Unknown and left out of the average; the other weights are rescaled.
          </li>
          <li>
            <span className="text-foreground font-medium">Not a security certification.</span> It
            summarises maintenance signals. It doesn&apos;t prove the absence of vulnerabilities.
          </li>
          <li>
            Compare repositories with care: language, project type, scan coverage and configuration
            all differ.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
