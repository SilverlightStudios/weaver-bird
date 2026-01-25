import React, { forwardRef, useEffect, useRef, useCallback, type HTMLAttributes } from "react";
import { useTooltipContext } from "./TooltipContext";

export interface TooltipTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const TooltipTrigger = forwardRef<
  HTMLButtonElement,
  TooltipTriggerProps
>(
  (
    {
      asChild,
      children,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const { setOpen, delayDuration, triggerRef } = useTooltipContext();
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      timeoutRef.current = setTimeout(() => {
        setOpen(true);
      }, delayDuration);
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setOpen(false);
      onMouseLeave?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
      setOpen(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
      setOpen(false);
      onBlur?.(e);
    };

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const child =
      asChild && React.isValidElement(children)
        ? (children as React.ReactElement)
        : null;
    const childRef = child ? (child as { ref?: React.Ref<unknown> }).ref : null;

    const mergedRef = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
        // Only call child ref if it's a function
        if (typeof childRef === "function") {
          childRef(node);
        }
      },
      [triggerRef, ref, childRef],
    );

    if (child) {
      // eslint-disable-next-line react-hooks/refs
      return React.cloneElement(child, {
        ref: mergedRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
      });
    }

    return (
      <button
        ref={mergedRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {children}
      </button>
    );
  },
);
TooltipTrigger.displayName = "TooltipTrigger";
