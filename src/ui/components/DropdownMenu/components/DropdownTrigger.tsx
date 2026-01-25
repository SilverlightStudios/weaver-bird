import React, { forwardRef, useCallback, type ButtonHTMLAttributes } from "react";
import { useDropdownContext } from "./DropdownContext";

export interface DropdownMenuTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ asChild, children, ...props }, ref) => {
  const { open, setOpen, triggerId, contentId } = useDropdownContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOpen(!open);
    props.onClick?.(e);
  };

  const child = asChild && React.isValidElement(children) ? (children as React.ReactElement) : null;
  const childRef = child ? (child as { ref?: React.Ref<unknown> }).ref : null;

  const mergedRef = useCallback((node: HTMLButtonElement | null) => {
    // Merge refs - only call function refs and our own object ref
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    }
    // Only call child ref if it's a function (we can't safely modify object refs we don't own)
    if (typeof childRef === "function") {
      childRef(node);
    }
  }, [ref, childRef]);

  if (child) {
    // eslint-disable-next-line react-hooks/refs
    return React.cloneElement(child, {
      ref: mergedRef,
      id: triggerId,
      "aria-expanded": open,
      "aria-controls": contentId,
      "aria-haspopup": "true",
      onClick: handleClick,
    });
  }

  return (
    <button
      ref={ref}
      id={triggerId}
      aria-expanded={open}
      aria-controls={contentId}
      aria-haspopup="true"
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";
