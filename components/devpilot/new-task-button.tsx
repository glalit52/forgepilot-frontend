"use client";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppUI } from "@/components/app/app-ui";
import { useSession } from "@/lib/api/hooks";
import { can } from "@/lib/domain/permissions";
import { ReasonTip } from "./bits";

/** Primary "New task" action, permission-aware. */
export function NewTaskButton({
  size = "default",
  label = "New task",
}: {
  size?: "default" | "sm";
  label?: string;
}) {
  const { openNewTask } = useAppUI();
  const role = useSession().data?.role;
  const allowed = can(role, "task.create");
  return (
    <ReasonTip
      reason={
        role && !allowed
          ? "Viewers can't create tasks. Ask a workspace admin for Member access."
          : undefined
      }
    >
      <Button size={size} onClick={() => openNewTask()} disabled={!allowed}>
        <PlusIcon /> {label}
      </Button>
    </ReasonTip>
  );
}
