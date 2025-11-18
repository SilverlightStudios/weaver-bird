import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import s from "./Tooltip.module.scss";

// Context for managing tooltip state
interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  delayDuration: number;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip components must be used within Tooltip");
  }
  return context;
}

// Root component
export interface TooltipProps {
  children: ReactNode;
  delayDuration?: number;
  defaultOpen?: boolean;
}

export function Tooltip({
  children,
  delayDuration = 200,
  defaultOpen = false,
}: TooltipProps) {
  const [open, setOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <TooltipContext.Provider
      value={{ open, setOpen, delayDuration, triggerRef }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

// Trigger component
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
    const timeoutRef = useRef<NodeJS.Timeout>();

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

    const child = asChild && React.isValidElement(children) ? (children as React.ReactElement) : null;
    const childRef = child ? (child as { ref?: React.Ref<unknown> }).ref : null;

    const mergedRef = useCallback((node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
      // Only call child ref if it's a function
      if (typeof childRef === "function") {
        childRef(node);
      }
    }, [triggerRef, ref, childRef]);

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

// Content component
export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      className,
      children,
      side = "top",
      align = "center",
      sideOffset = 10,
      ...props
    },
    ref,
  ) => {
    const { open, triggerRef } = useTooltipContext();
    const contentRef = useRef<HTMLDivElement>(null);

    // Position the tooltip relative to trigger
    useEffect(() => {
      if (!open || !contentRef.current || !triggerRef.current) return;

      const content = contentRef.current;
      const trigger = triggerRef.current;

      const updatePosition = () => {
        const triggerRect = trigger.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        // For position: absolute, we need viewport coordinates + scroll offset
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const scrollX = window.scrollX || document.documentElement.scrollLeft;

        let top = 0;
        let left = 0;

        // Calculate position based on side
        switch (side) {
          case "top":
            top = triggerRect.top + scrollY - contentRect.height - sideOffset;
            break;
          case "bottom":
            top = triggerRect.bottom + scrollY + sideOffset;
            break;
          case "left":
            left = triggerRect.left + scrollX - contentRect.width - sideOffset;
            top = triggerRect.top + scrollY;
            break;
          case "right":
            left = triggerRect.right + scrollX + sideOffset;
            top = triggerRect.top + scrollY;
            break;
        }

        // Calculate alignment
        if (side === "top" || side === "bottom") {
          switch (align) {
            case "start":
              left = triggerRect.left + scrollX;
              break;
            case "center":
              left =
                triggerRect.left +
                scrollX +
                triggerRect.width / 2 -
                contentRect.width / 2;
              break;
            case "end":
              left = triggerRect.right + scrollX - contentRect.width;
              break;
          }
        } else {
          switch (align) {
            case "start":
              top = triggerRect.top + scrollY;
              break;
            case "center":
              top =
                triggerRect.top +
                scrollY +
                triggerRect.height / 2 -
                contentRect.height / 2;
              break;
            case "end":
              top = triggerRect.bottom + scrollY - contentRect.height;
              break;
          }
        }

        content.style.top = `${top}px`;
        content.style.left = `${left}px`;
      };

      requestAnimationFrame(() => {
        updatePosition();
      });

      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }, [open, side, align, sideOffset, triggerRef]);

    if (!open) return null;

    return createPortal(
      <div
        ref={(node) => {
          if (contentRef) {
            (
              contentRef as React.MutableRefObject<HTMLDivElement | null>
            ).current = node;
          }
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role="tooltip"
        className={[s.content, className].filter(Boolean).join(" ")}
        data-side={side}
        {...props}
      >
        {children}
      </div>,
      document.body,
    );
  },
);
TooltipContent.displayName = "TooltipContent";

// Provider component for multiple tooltips
export interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({
  children,
  delayDuration: _delayDuration,
}: TooltipProviderProps) {
  // This is mainly for API compatibility with shadcn
  // Our implementation doesn't need a global provider
  return <>{children}</>;
}
