import { createContext, useContext } from "react";

export interface DrawerContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  position: "bottom" | "top" | "left" | "right" | "center";
  portalContainer?: HTMLElement | null;
  modal: boolean;
}

export const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawerContext() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("Drawer components must be used within Drawer");
  }
  return context;
}
