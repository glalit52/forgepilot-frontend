import type { AgentRun, ResolvedActor } from "@/lib/schemas";
import { AGENT_LABEL } from "@/lib/domain/labels";

const MANUAL_PREFIX = "manual:";

export function isManualRun(run: Pick<AgentRun, "model">) {
  return run.model.startsWith(MANUAL_PREFIX);
}

/** Rule 4: a manual run (model `manual:<name>`) is shown as a person, never as an agent. */
export function runActor(
  run: Pick<AgentRun, "id" | "agent" | "model" | "modelVersion">,
): ResolvedActor {
  if (isManualRun(run)) {
    return {
      type: "person",
      id: run.id,
      name: run.model.slice(MANUAL_PREFIX.length),
      detail: "Manual change",
    };
  }
  return {
    type: "agent",
    id: `${run.agent}:${run.model}`,
    name: AGENT_LABEL[run.agent],
    detail: run.modelVersion ? `${run.model} ${run.modelVersion}` : run.model,
  };
}
