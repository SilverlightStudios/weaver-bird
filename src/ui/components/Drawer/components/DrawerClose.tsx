import React, { forwardRef } from "react";
import { useDrawerContext } from "./DrawerContext";

export const DrawerClose = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, onClick, ...props }, ref) => {
  const { setOpen } = useDrawerContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(false);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
    });
  }

  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
DrawerClose.displayName = "DrawerClose";
