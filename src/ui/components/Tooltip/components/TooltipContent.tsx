import { forwardRef, useEffect, useRef, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import s from "../Tooltip.module.scss";
import { useTooltipContext } from "./TooltipContext";

export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

function calculateSidePosition(
  side: "top" | "right" | "bottom" | "left",
  triggerRect: DOMRect,
  contentRect: DOMRect,
  scrollX: number,
  scrollY: number,
  sideOffset: number,
): { top: number; left: number } {
  let top = 0;
  let left = 0;

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

  return { top, left };
}

function calculateAlignment(
  side: "top" | "right" | "bottom" | "left",
  align: "start" | "center" | "end",
  triggerRect: DOMRect,
  contentRect: DOMRect,
  scrollX: number,
  scrollY: number,
): { top: number; left: number } {
  let top = 0;
  let left = 0;

  if (side === "top" || side === "bottom") {
    switch (align) {
      case "start":
        left = triggerRect.left + scrollX;
        break;
      case "center":
        left = triggerRect.left + scrollX + triggerRect.width / 2 - contentRect.width / 2;
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
        top = triggerRect.top + scrollY + triggerRect.height / 2 - contentRect.height / 2;
        break;
      case "end":
        top = triggerRect.bottom + scrollY - contentRect.height;
        break;
    }
  }

  return { top, left };
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

        // Calculate position based on side
        const sidePos = calculateSidePosition(
          side,
          triggerRect,
          contentRect,
          scrollX,
          scrollY,
          sideOffset,
        );

        // Calculate alignment
        const alignPos = calculateAlignment(
          side,
          align,
          triggerRect,
          contentRect,
          scrollX,
          scrollY,
        );

        let top = sidePos.top !== 0 ? sidePos.top : alignPos.top;
        let left = sidePos.left !== 0 ? sidePos.left : alignPos.left;

        // Collision detection - keep tooltip on screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 8; // Minimum distance from edge

        // Check horizontal boundaries
        if (left < scrollX + padding) {
          left = scrollX + padding;
        } else if (
          left + contentRect.width >
          scrollX + viewportWidth - padding
        ) {
          left = scrollX + viewportWidth - contentRect.width - padding;
        }

        // Check vertical boundaries
        if (top < scrollY + padding) {
          top = scrollY + padding;
        } else if (
          top + contentRect.height >
          scrollY + viewportHeight - padding
        ) {
          top = scrollY + viewportHeight - contentRect.height - padding;
        }

        // Calculate caret offset to keep it pointing at the trigger
        let caretOffsetX = 0;
        let caretOffsetY = 0;

        if (side === "top" || side === "bottom") {
          // Calculate horizontal offset from center
          const triggerCenterX =
            triggerRect.left + scrollX + triggerRect.width / 2;
          const tooltipCenterX = left + contentRect.width / 2;
          caretOffsetX = triggerCenterX - tooltipCenterX;
        } else {
          // Calculate vertical offset from center
          const triggerCenterY =
            triggerRect.top + scrollY + triggerRect.height / 2;
          const tooltipCenterY = top + contentRect.height / 2;
          caretOffsetY = triggerCenterY - tooltipCenterY;
        }

        content.style.top = `${top}px`;
        content.style.left = `${left}px`;
        content.style.setProperty("--caret-offset-x", `${caretOffsetX}px`);
        content.style.setProperty("--caret-offset-y", `${caretOffsetY}px`);
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
