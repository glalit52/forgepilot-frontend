"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface PanelState {
  title: string;
  description?: string;
  content: React.ReactNode;
}

const Ctx = createContext<{ open: (p: PanelState) => void; close: () => void }>({
  open: () => {},
  close: () => {},
});

/** Right context panel slot: details for a selected row (task, PR, evidence). */
export function ContextPanelProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanel] = useState<PanelState | null>(null);
  const close = useCallback(() => setPanel(null), []);
  const value = useMemo(() => ({ open: setPanel, close }), [close]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet open={!!panel} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="sm:max-w-lg">
          {panel && (
            <>
              <SheetHeader>
                <SheetTitle>{panel.title}</SheetTitle>
                {panel.description && <SheetDescription>{panel.description}</SheetDescription>}
              </SheetHeader>
              <div className="px-5 pb-6">{panel.content}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}

export function useContextPanel() {
  return useContext(Ctx);
}
