import { useState, useRef, type ReactNode } from "react";
import { TooltipContext } from "./TooltipContext";

export interface TooltipProps {
  children: ReactNode;
  delayDuration?: number;
  defaultOpen?: boolean;
}

export function Tooltip({
  children,
  delayDuration = 200,
  defaultOpen = false,
}: TooltipProps) {
  const [open, setOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <TooltipContext.Provider
      value={{ open, setOpen, delayDuration, triggerRef }}
    >
      {children}
    </TooltipContext.Provider>
  );
}
