/**
 * Task state machine. Shared by the UI (which buttons are enabled) and the
 * mock API (which transitions are allowed). Product rules enforced here:
 *  - Verified before shipped: sign-off needs a passed verification and an
 *    explicit "I reviewed the diff"; Open PR needs a sign-off.
 *  - Client stays in control: nothing here merges. Merge happens in the
 *    client's Git under their branch rules.
 */
import type { TaskAction, TaskState, VerificationRun } from "@/lib/schemas";

export const MAX_ATTEMPTS = 3;

const ALLOWED: Record<TaskAction, TaskState[]> = {
  save_plan: ["created", "planned", "plan_approved"],
  approve_plan: ["created", "planned"],
  launch: ["plan_approved"],
  stop: ["running"],
  retry: ["retrying", "escalated", "awaiting_review", "rejected", "failed"],
  take_over: ["running", "retrying", "escalated", "plan_approved"],
  sign_off: ["awaiting_review"],
  open_pr: ["signed_off"],
  escalate: ["running", "retrying", "verifying"],
  close: ["merged", "failed", "rejected"],
};

export interface ActionContext {
  state: TaskState;
  latestVerification: Pick<VerificationRun, "status"> | null;
  reviewedDiff?: boolean;
}

export interface ActionCheck {
  allowed: boolean;
  reason?: string;
}

export function checkAction(action: TaskAction, ctx: ActionContext): ActionCheck {
  if (!ALLOWED[action].includes(ctx.state)) {
    return { allowed: false, reason: `Not available while the task is "${ctx.state}".` };
  }
  if (action === "sign_off") {
    if (ctx.latestVerification?.status !== "passed") {
      return { allowed: false, reason: "Verification must pass before sign-off." };
    }
    if (!ctx.reviewedDiff) {
      return { allowed: false, reason: 'Tick "I reviewed the diff" to sign off.' };
    }
  }
  return { allowed: true };
}

export function availableActions(ctx: ActionContext): TaskAction[] {
  return (Object.keys(ALLOWED) as TaskAction[]).filter(
    (a) => checkAction(a, { ...ctx, reviewedDiff: true }).allowed,
  );
}

/** Rule 1: never offer to ship unless verified AND signed off. */
export function canShip(state: TaskState, verificationPassed: boolean, signedOff: boolean) {
  return state === "signed_off" && verificationPassed && signedOff;
}

/** After a run's verification completes, where does the task go? */
export function nextStateAfterVerification(passed: boolean, attempts: number): TaskState {
  if (passed) return "awaiting_review";
  return attempts >= MAX_ATTEMPTS ? "escalated" : "retrying";
}

export function canClientDecide(state: TaskState) {
  return state === "pr_open";
}
