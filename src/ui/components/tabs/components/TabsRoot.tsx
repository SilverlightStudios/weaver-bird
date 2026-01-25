import * as React from "react";
import { useState } from "react";
import s from "../styles.module.scss";
import { TabsContext } from "./TabsContext";

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
      defaultValue ?? controlledValue ?? "",
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
          className={`${s.tabsRoot} ${className ?? ""}`}
          data-orientation={orientation}
          {...props}
        />
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = "Tabs";
