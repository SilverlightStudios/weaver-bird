import * as React from "react";
import s from "../styles.module.scss";

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  stretch?: boolean;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, stretch = false, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={`${s.tabsList} ${stretch ? s.tabsListStretch : ""} ${className ?? ""}`}
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";
