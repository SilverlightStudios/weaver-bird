import { createContext, useContext } from "react";

export interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}
