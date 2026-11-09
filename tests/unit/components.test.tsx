import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActorChip } from "@/components/shared/actor-chip";
import { HealthScore } from "@/components/shared/health-score";
import { StatusBadge } from "@/components/shared/status-badge";
import { SlaMeter } from "@/components/shared/sla-meter";
import { EvidenceTimeline } from "@/components/shared/evidence-timeline";
import type { EvidenceItem } from "@/lib/schemas";

describe("shared components", () => {
  it("StatusBadge shows a readable label for each state", () => {
    render(<StatusBadge state="awaiting_review" />);
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
  });

  it("ActorChip makes agent vs person explicit, including the model", () => {
    const { container } = render(
      <>
        <ActorChip
          actor={{
            type: "agent",
            id: "claude_code:claude-sonnet",
            name: "Claude Code",
            detail: "claude-sonnet",
          }}
        />
        <ActorChip
          actor={{ type: "person", id: "u_arjun", name: "Arjun Rao", detail: "Senior Engineer" }}
        />
      </>,
    );
    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText(/claude-sonnet/)).toBeInTheDocument();
    expect(screen.getByText("(AI agent)")).toBeInTheDocument();
    expect(screen.getByText("(person)")).toBeInTheDocument();
    expect(container.querySelector('[data-actor-type="agent"]')).not.toBeNull();
  });

  it("HealthScore announces score and band", () => {
    render(<HealthScore score={64} delta={-3} />);
    expect(
      screen.getByRole("img", { name: /Health score 64 of 100, At risk, down 3/ }),
    ).toBeInTheDocument();
  });

  it("SlaMeter exposes value and target to assistive tech", () => {
    render(<SlaMeter metPct={92} targetPct={95} breaches={2} />);
    expect(screen.getByRole("meter", { name: /92% against 95% target/ })).toBeInTheDocument();
    expect(screen.getByText("2 breaches")).toBeInTheDocument();
  });

  it("EvidenceTimeline shows chain status and every record", () => {
    const rec = (i: number, event: EvidenceItem["event"]): EvidenceItem => ({
      id: `e${i}`,
      taskId: "t",
      event,
      actor: { type: "system", id: "verification-engine" },
      actorResolved: {
        type: "system",
        id: "verification-engine",
        name: "Verification engine",
        detail: "Tests",
      },
      at: "2026-11-08T10:00:00Z",
      payload: {},
      hash: `h${i}`.padEnd(16, "0"),
      prevHash: i ? `h${i - 1}`.padEnd(16, "0") : null,
      hashValid: true,
    });
    render(
      <EvidenceTimeline
        records={[rec(0, "task_created"), rec(1, "verification_passed")]}
        chainValid
      />,
    );
    expect(screen.getByText(/Hash chain intact/)).toBeInTheDocument();
    expect(screen.getByText("Verification passed")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
