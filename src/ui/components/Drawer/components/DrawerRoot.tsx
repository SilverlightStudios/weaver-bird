import { useState, type ReactNode } from "react";
import { DrawerContext } from "./DrawerContext";

export interface DrawerProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: "bottom" | "top" | "left" | "right" | "center";
  portalContainer?: HTMLElement | null;
  modal?: boolean;
}

export function Drawer({
  children,
  open: controlledOpen,
  onOpenChange,
  position = "bottom",
  portalContainer,
  modal = true,
}: DrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <DrawerContext.Provider
      value={{
        open,
        setOpen: handleOpenChange,
        position,
        portalContainer,
        modal,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}
Drawer.displayName = "Drawer";
