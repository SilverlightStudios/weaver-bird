/**
 * Anti-Design Tabs Component
 *
 * A playful, punk-aesthetic tabs component built with vanilla React.
 * Uses heavy shadows, asymmetric borders, and spring animations.
 */

import * as React from "react";
import { createContext, useContext, useState } from "react";
import s from "./styles.module.scss";

// Context for managing tab state
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

// Root Tabs component
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue,
      onValueChange,
      orientation = "horizontal",
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(
      defaultValue || controlledValue || "",
    );
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const handleValueChange = (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div
          ref={ref}
          className={`${s.tabsRoot} ${className || ""}`}
          data-orientation={orientation}
          {...props}
        />
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = "Tabs";

// TabsList component
export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={`${s.tabsList} ${className || ""}`}
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";

// TabsTrigger component
export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ className, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = value === selectedValue;

  return (
    <button
      ref={ref}
      role="tab"
      type="button"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      className={`${s.tabsTrigger} ${className || ""}`}
      onClick={() => onValueChange(value)}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

// TabsContent component
export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = value === selectedValue;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        aria-hidden={!isSelected}
        className={`${s.tabsContent} ${className || ""}`}
        {...props}
      />
    );
  },
);
TabsContent.displayName = "TabsContent";
