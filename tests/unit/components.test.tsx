import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActorChip } from "@/components/shared/actor-chip";
import { HealthBreakdown } from "@/components/shared/health-breakdown";
import { HealthScore } from "@/components/shared/health-score";
import { FailureClassBadge, TaskStatusBadge } from "@/components/shared/status-badge";
import { UsageMeter } from "@/components/shared/usage-meter";
import { LifecycleStepper } from "@/components/shared/lifecycle";

describe("shared components", () => {
  it("TaskStatusBadge uses readable labels", () => {
    render(<TaskStatusBadge status="review_ready" />);
    expect(screen.getByText("Ready for review")).toBeInTheDocument();
  });
  it("ActorChip makes agent vs person explicit, including the model", () => {
    render(
      <>
        <ActorChip
          actor={{ type: "agent", id: "a", name: "Claude Code", detail: "claude-sonnet" }}
        />
        <ActorChip
          actor={{ type: "person", id: "u", name: "Dev Patel", detail: "Staff engineer" }}
        />
      </>,
    );
    expect(screen.getByText(/claude-sonnet/)).toBeInTheDocument();
    expect(screen.getByText("(AI agent)")).toBeInTheDocument();
    expect(screen.getByText("(person)")).toBeInTheDocument();
  });
  it("HealthScore announces score and band, and handles unknown", () => {
    render(<HealthScore score={64} delta={-3} />);
    expect(
      screen.getByRole("img", { name: /Health score 64 of 100, Needs attention, down 3/ }),
    ).toBeInTheDocument();
    render(<HealthScore score={null} />);
    expect(screen.getByRole("img", { name: "Health score unknown" })).toBeInTheDocument();
  });
  it("HealthBreakdown shows weights and 'Unknown' instead of a fake value", () => {
    render(
      <HealthBreakdown
        health={{
          score: 74,
          scoreVersion: "v1.2",
          dependencies: 68,
          security: 54,
          buildStability: 88,
          tests: 81,
          docs: null,
        }}
      />,
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });
  it("FailureClassBadge explains infra failures", () => {
    render(<FailureClassBadge classification="infrastructure" />);
    expect(screen.getByTitle(/Never blamed on your change/)).toBeInTheDocument();
  });
  it("UsageMeter exposes usage to assistive tech and warns on projected overage", () => {
    render(
      <UsageMeter label="Agent runtime" used={4000} limit={6000} projected={7300} unit="min" />,
    );
    expect(
      screen.getByRole("meter", { name: /Agent runtime: 4,000 of 6,000/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/over the included amount/)).toBeInTheDocument();
  });
  it("LifecycleStepper marks the current step", () => {
    render(
      <LifecycleStepper
        steps={[
          { key: "plan", label: "Plan", state: "done", detail: null, href: null },
          { key: "verify", label: "Verify", state: "current", detail: null, href: null },
        ]}
      />,
    );
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Verify");
  });
});
