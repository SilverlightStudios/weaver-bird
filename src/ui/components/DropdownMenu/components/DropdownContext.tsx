import React from "react";

export interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
}

export const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function useDropdownContext() {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within DropdownMenu");
  }
  return context;
}

export const RadioGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);
