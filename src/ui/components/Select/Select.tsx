import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import s from "./Select.module.scss";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  renderTrigger?: (props: {
    selectedLabel?: string;
    placeholder?: string;
    isOpen: boolean;
  }) => ReactNode;
  className?: string;
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  emptyMessage = "No options available.",
  renderTrigger,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerDivRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const triggerElement = triggerDivRef.current || triggerButtonRef.current;
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerElement &&
        !triggerElement.contains(e.target as Node)
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
  }, [open]);

  // Position the dropdown relative to trigger
  useEffect(() => {
    const triggerElement = triggerDivRef.current || triggerButtonRef.current;
    if (!open || !contentRef.current || !triggerElement) return;

    const trigger = triggerElement;
    const content = contentRef.current;

    const updatePosition = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const contentWidth = content.offsetWidth || triggerRect.width;
      const viewportWidth = window.innerWidth;

      // For position: absolute, we need viewport coordinates + scroll offset
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      // Position below the trigger
      content.style.top = `${triggerRect.bottom + scrollY + 8}px`;
      content.style.minWidth = `${triggerRect.width}px`;

      // Check if dropdown would overflow on the right
      const leftPosition = triggerRect.left + scrollX;
      const rightEdge = leftPosition + contentWidth;
      const viewportRight = viewportWidth + scrollX;

      if (rightEdge > viewportRight - 16) {
        // Align right edge of dropdown with right edge of trigger
        const rightAlignedLeft = triggerRect.right + scrollX - contentWidth;
        content.style.left = `${Math.max(16, rightAlignedLeft)}px`;
      } else {
        // Align left edge of dropdown with left edge of trigger
        content.style.left = `${leftPosition}px`;
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
  }, [open]);

  const triggerButton = renderTrigger ? (
    <div
      ref={triggerDivRef}
      role="listbox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      style={{ display: "inline-block" }}
    >
      {renderTrigger({
        selectedLabel: selectedOption?.label,
        placeholder,
        isOpen: open,
      })}
    </div>
  ) : (
    <button
      ref={triggerButtonRef}
      className={[s.trigger, className].filter(Boolean).join(" ")}
      role="listbox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      type="button"
    >
      <span className={s.triggerText}>
        {selectedOption?.label || placeholder}
      </span>
      <span className={s.triggerIcon}>{open ? "▲" : "▼"}</span>
    </button>
  );

  // In Storybook iframes, portal to the iframe's body
  const portalTarget = document.body;

  const dropdownContent = open
    ? createPortal(
        <div ref={contentRef} className={s.content} data-side="bottom">
          <div className={s.list}>
            {options.length === 0 ? (
              <div className={s.empty}>{emptyMessage}</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  className={[
                    s.item,
                    value === option.value ? s.selected : "",
                    option.disabled ? s.disabled : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (!option.disabled) {
                      handleSelect(option.value);
                    }
                  }}
                  role="option"
                  aria-selected={value === option.value}
                  aria-disabled={option.disabled}
                >
                  <span className={s.itemCheck}>
                    {value === option.value && "✓"}
                  </span>
                  <span className={s.itemLabel}>{option.label}</span>
                </div>
              ))
            )}
          </div>
        </div>,
        portalTarget,
      )
    : null;

  return (
    <>
      {triggerButton}
      {dropdownContent}
    </>
  );
}
