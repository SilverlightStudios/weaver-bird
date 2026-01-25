import { useState, useId, type ReactNode } from "react";
import { DropdownContext } from "./DropdownContext";

export interface DropdownMenuProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  children,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const triggerId = `dropdown-trigger-${useId()}`;
  const contentId = `dropdown-content-${useId()}`;

  return (
    <DropdownContext.Provider
      value={{ open, setOpen: handleOpenChange, triggerId, contentId }}
    >
      {children}
    </DropdownContext.Provider>
  );
}
