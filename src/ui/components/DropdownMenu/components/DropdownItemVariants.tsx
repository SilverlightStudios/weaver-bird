/* eslint-disable react/no-multi-comp */
import React, { forwardRef, type HTMLAttributes } from "react";
import s from "../DropdownMenu.module.scss";
import { useDropdownContext, RadioGroupContext } from "./DropdownContext";

// Item component
export interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  inset?: boolean;
  onSelect?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(({ className, disabled, inset, onSelect, ...props }, ref) => {
  const { setOpen } = useDropdownContext();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onSelect?.(e);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      role="menuitem"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={[s.item, inset ? s.inset : "", className]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      data-disabled={disabled}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

// CheckboxItem component
export interface DropdownMenuCheckboxItemProps
  extends Omit<DropdownMenuItemProps, "onSelect"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  DropdownMenuCheckboxItemProps
>(({ className, children, checked, onCheckedChange, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onCheckedChange?.(!checked);
  };

  return (
    <div
      ref={ref}
      role="menuitemcheckbox"
      aria-checked={checked}
      className={[s.checkboxItem, className].filter(Boolean).join(" ")}
      onClick={handleClick}
      {...props}
    >
      <span className={s.itemIndicator}>
        {checked && <span className={s.checkmark}>✓</span>}
      </span>
      {children}
    </div>
  );
});
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

// RadioGroup component
export interface DropdownMenuRadioGroupProps
  extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const DropdownMenuRadioGroup = forwardRef<
  HTMLDivElement,
  DropdownMenuRadioGroupProps
>(({ className, value, onValueChange, ...props }, ref) => (
  <RadioGroupContext.Provider value={{ value, onValueChange }}>
    <div ref={ref} role="group" className={className} {...props} />
  </RadioGroupContext.Provider>
));
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup";

// RadioItem component
export interface DropdownMenuRadioItemProps
  extends Omit<DropdownMenuItemProps, "onSelect"> {
  value: string;
}

export const DropdownMenuRadioItem = forwardRef<
  HTMLDivElement,
  DropdownMenuRadioItemProps
>(({ className, children, value, ...props }, ref) => {
  const radioContext = React.useContext(RadioGroupContext);
  const checked = radioContext?.value === value;

  const handleClick = () => {
    radioContext?.onValueChange?.(value);
  };

  return (
    <div
      ref={ref}
      role="menuitemradio"
      aria-checked={checked}
      className={[s.radioItem, className].filter(Boolean).join(" ")}
      onClick={handleClick}
      {...props}
    >
      <span className={s.itemIndicator}>
        {checked && <span className={s.radioDot}>●</span>}
      </span>
      {children}
    </div>
  );
});
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";
