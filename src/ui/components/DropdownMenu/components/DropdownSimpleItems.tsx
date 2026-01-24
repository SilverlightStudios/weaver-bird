/* eslint-disable react/no-multi-comp */
import { forwardRef, type HTMLAttributes } from "react";
import s from "../DropdownMenu.module.scss";

// Group component
export const DropdownMenuGroup = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} role="group" className={className} {...props} />
));
DropdownMenuGroup.displayName = "DropdownMenuGroup";

// Label component
export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={[s.label, inset ? s.inset : "", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

// Separator component
export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={[s.separator, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

// Shortcut component
export const DropdownMenuShortcut = ({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={[s.shortcut, className].filter(Boolean).join(" ")}
    {...props}
  />
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
