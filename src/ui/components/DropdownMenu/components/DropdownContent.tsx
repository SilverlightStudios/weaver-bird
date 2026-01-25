import { forwardRef, useEffect, useRef, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import s from "../DropdownMenu.module.scss";
import { useDropdownContext } from "./DropdownContext";

export interface DropdownMenuContentProps
  extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, children, align = "start", sideOffset = 8, ...props }, ref) => {
  const { open, setOpen, triggerId, contentId } = useDropdownContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const trigger = document.getElementById(triggerId);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        trigger &&
        !trigger.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, setOpen, triggerId]);

  // Position the dropdown relative to trigger
  useEffect(() => {
    if (!open || !contentRef.current) return;

    const trigger = document.getElementById(triggerId);
    const content = contentRef.current;

    if (!trigger) return;

    const updatePosition = () => {
      const triggerRect = trigger.getBoundingClientRect();

      // For position: absolute, we need viewport coordinates + scroll offset
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      let left = triggerRect.left + scrollX;
      if (align === "center") {
        left = triggerRect.left + scrollX + triggerRect.width / 2;
      } else if (align === "end") {
        left = triggerRect.right + scrollX;
      }

      content.style.top = `${triggerRect.bottom + scrollY + sideOffset}px`;
      content.style.left = `${left}px`;

      if (align === "center") {
        content.style.transform = "translateX(-50%)";
      } else if (align === "end") {
        content.style.transform = "translateX(-100%)";
      } else {
        content.style.transform = "";
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      updatePosition();
    });

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align, sideOffset, triggerId]);

  if (!open) return null;

  // In Storybook iframes, portal to the iframe's body, not the main document
  const portalTarget = document.body;

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
      id={contentId}
      role="menu"
      className={[s.content, className].filter(Boolean).join(" ")}
      data-side="bottom"
      {...props}
    >
      {children}
    </div>,
    portalTarget,
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";
