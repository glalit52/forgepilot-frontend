"use client";
import { createContext, useContext, useMemo, useState } from "react";
import type { NewTaskInput } from "@/lib/schemas";
import { NewTaskDialog } from "@/components/devpilot/new-task-dialog";

type Defaults = Partial<Pick<NewTaskInput, "repositoryId" | "title" | "description" | "agentId">>;

const Ctx = createContext<{ openNewTask: (defaults?: Defaults) => void }>({ openNewTask: () => {} });

/** App-wide UI: lets the command palette, pages and empty states open the New task dialog. */
export function AppUIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; defaults?: Defaults }>({ open: false });
  const value = useMemo(() => ({ openNewTask: (defaults?: Defaults) => setState({ open: true, defaults }) }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      <NewTaskDialog open={state.open} defaults={state.defaults} onOpenChange={(open) => setState((s) => ({ ...s, open }))} />
    </Ctx.Provider>
  );
}

export function useAppUI() {
  return useContext(Ctx);
}
