"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { NewTaskDialog } from "./new-task-dialog";

const Ctx = createContext<{
  openNewTask: (defaults?: { orgId?: string; repositoryId?: string }) => void;
}>({
  openNewTask: () => {},
});

/** Console-wide UI state: lets the command palette and pages open the New task dialog. */
export function ConsoleUIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    defaults?: { orgId?: string; repositoryId?: string };
  }>({ open: false });
  const value = useMemo(
    () => ({
      openNewTask: (defaults?: { orgId?: string; repositoryId?: string }) =>
        setState({ open: true, defaults }),
    }),
    [],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      <NewTaskDialog
        open={state.open}
        defaults={state.defaults}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      />
    </Ctx.Provider>
  );
}

export function useConsoleUI() {
  return useContext(Ctx);
}
