"use client";
import { useState } from "react";
import { CheckCircle2Icon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Plan, TaskAction } from "@/lib/schemas";
import { ActionButton } from "../action-button";

type RowListProps = {
  label: string;
  itemLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
  disabled: boolean;
  ordered?: boolean;
};

function RowList({ label, itemLabel, items, onChange, disabled, ordered }: RowListProps) {
  const update = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="text-muted-foreground mb-1.5 text-xs font-medium">{label}</legend>
      {items.length === 0 && <p className="text-muted-foreground text-xs">None yet.</p>}
      <ol className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span
              className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums"
              aria-hidden
            >
              {ordered ? `${i + 1}.` : "•"}
            </span>
            <Input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              aria-label={`${itemLabel} ${i + 1}`}
              aria-invalid={!item.trim() || undefined}
              className="h-8 text-sm"
            />
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(i)}
                aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
                className="text-muted-foreground shrink-0"
              >
                <Trash2Icon />
              </Button>
            )}
          </li>
        ))}
      </ol>
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => onChange([...items, ""])}
        >
          <PlusIcon /> Add {itemLabel.toLowerCase()}
        </Button>
      )}
    </fieldset>
  );
}

/**
 * Editable plan (steps + acceptance criteria). Keyed by the saved plan in the
 * parent so a server update resets the draft.
 */
export function PlanEditor({
  plan,
  approvedByName,
  canEdit,
  approveReason,
  pending,
  onAction,
}: {
  plan: Plan;
  approvedByName: string | null;
  canEdit: boolean;
  /** Undefined = Approve plan allowed. */
  approveReason?: string;
  pending: TaskAction | null;
  onAction: (
    action: "save_plan" | "approve_plan",
    plan?: { steps: string[]; acceptanceCriteria: string[] },
  ) => void;
}) {
  const [steps, setSteps] = useState(plan.steps);
  const [criteria, setCriteria] = useState(plan.acceptanceCriteria);
  const dirty =
    JSON.stringify(steps) !== JSON.stringify(plan.steps) ||
    JSON.stringify(criteria) !== JSON.stringify(plan.acceptanceCriteria);
  const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
  const cleanCriteria = criteria.map((s) => s.trim()).filter(Boolean);
  const invalid =
    cleanSteps.length === 0
      ? "Add at least one step."
      : cleanCriteria.length === 0
        ? "Add at least one acceptance criterion."
        : undefined;

  return (
    <div className="flex flex-col gap-4">
      {plan.approvedBy && !dirty && (
        <p className="text-success-foreground bg-success-soft flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs">
          <CheckCircle2Icon className="size-3.5" aria-hidden />
          Plan approved{approvedByName ? ` by ${approvedByName}` : ""}
        </p>
      )}
      <RowList
        label="Steps"
        itemLabel="Step"
        items={steps}
        onChange={setSteps}
        disabled={!canEdit}
        ordered
      />
      <RowList
        label="Acceptance criteria"
        itemLabel="Criterion"
        items={criteria}
        onChange={setCriteria}
        disabled={!canEdit}
      />
      {!canEdit && (
        <p className="text-muted-foreground text-xs">
          The plan is locked once the agent has started.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <ActionButton
            variant="outline"
            size="sm"
            disabledReason={!dirty ? "No changes to save." : invalid}
            disabled={pending !== null}
            onClick={() =>
              onAction("save_plan", { steps: cleanSteps, acceptanceCriteria: cleanCriteria })
            }
          >
            <SaveIcon /> {pending === "save_plan" ? "Saving…" : "Save plan"}
          </ActionButton>
        )}
        <ActionButton
          size="sm"
          disabledReason={approveReason ?? (dirty ? "Save your plan changes first." : undefined)}
          disabled={pending !== null}
          onClick={() => onAction("approve_plan")}
        >
          <CheckCircle2Icon /> Approve plan
        </ActionButton>
      </div>
    </div>
  );
}
