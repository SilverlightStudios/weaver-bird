import { createContext, useContext, type MutableRefObject } from "react";

export interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  delayDuration: number;
  triggerRef: MutableRefObject<HTMLElement | null>;
}

export const TooltipContext = createContext<TooltipContextValue | null>(null);

export function useTooltipContext() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip components must be used within Tooltip");
  }
  return context;
}
