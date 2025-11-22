import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Command as CommandPrimitive } from "cmdk";
import s from "./Combobox.module.scss";

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  renderTrigger?: (props: {
    selectedLabel?: string;
    placeholder?: string;
    isOpen: boolean;
  }) => ReactNode;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  renderTrigger,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const triggerDivRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? "" : currentValue;
    onValueChange?.(newValue);
    setOpen(false);
    setSearchValue("");
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

      // For position: fixed, we use viewport coordinates directly (no scroll offset needed)
      content.style.top = `${triggerRect.bottom + 8}px`;
      content.style.left = `${triggerRect.left}px`;
      content.style.width = `${triggerRect.width}px`;
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
      role="combobox"
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
      role="combobox"
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
          <CommandPrimitive className={s.command}>
            <div className={s.inputWrapper}>
              <span className={s.searchIcon}>🔍</span>
              <CommandPrimitive.Input
                className={s.input}
                placeholder={searchPlaceholder}
                value={searchValue}
                onValueChange={setSearchValue}
              />
            </div>
            <CommandPrimitive.List className={s.list}>
              <CommandPrimitive.Empty className={s.empty}>
                {emptyMessage}
              </CommandPrimitive.Empty>
              {options.map((option) => (
                <CommandPrimitive.Item
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                  disabled={option.disabled === true}
                  className={s.item}
                >
                  <span className={s.itemCheck}>
                    {value === option.value && "✓"}
                  </span>
                  <span className={s.itemLabel}>{option.label}</span>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.List>
          </CommandPrimitive>
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
