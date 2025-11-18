import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import s from "./DropdownMenu.module.scss";

// Context for managing dropdown state
interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within DropdownMenu");
  }
  return context;
}

// Root component
export interface DropdownMenuProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  children,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const triggerId = `dropdown-trigger-${useId()}`;
  const contentId = `dropdown-content-${useId()}`;

  return (
    <DropdownContext.Provider
      value={{ open, setOpen: handleOpenChange, triggerId, contentId }}
    >
      {children}
    </DropdownContext.Provider>
  );
}

// Trigger component
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

  const mergedRef = useCallback((node: HTMLElement | null) => {
    // Merge refs - only call function refs and our own object ref
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLElement | null>).current = node;
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

// Content component - uses native positioning
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

// Group component
export const DropdownMenuGroup = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} role="group" className={className} {...props} />
));
DropdownMenuGroup.displayName = "DropdownMenuGroup";

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

const RadioGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);

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

// Sub components (simplified - no nested positioning)
export const DropdownMenuSub = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export const DropdownMenuSubTrigger = forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(({ className, inset, children, ...props }, ref) => (
  <div
    ref={ref}
    className={[s.subTrigger, inset ? s.inset : "", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
    <span className={s.chevron}>›</span>
  </div>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

export const DropdownMenuSubContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={[s.subContent, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

// Portal and Close are no-ops since we handle them differently
export const DropdownMenuPortal = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);
export const DropdownMenuClose = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { setOpen } = useDropdownContext();
  return <button ref={ref} onClick={() => setOpen(false)} {...props} />;
});
DropdownMenuClose.displayName = "DropdownMenuClose";
