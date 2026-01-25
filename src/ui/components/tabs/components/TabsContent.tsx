import * as React from "react";
import s from "../styles.module.scss";
import { useTabsContext } from "./TabsContext";

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
        className={`${s.tabsContent} ${className ?? ""}`}
        {...props}
      />
    );
  },
);
TabsContent.displayName = "TabsContent";
