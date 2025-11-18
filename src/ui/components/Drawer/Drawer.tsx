import React, {
  forwardRef,
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import s from "./Drawer.module.scss";

// Context for managing drawer state
interface DrawerContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  position: "bottom" | "top" | "left" | "right" | "center";
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("Drawer components must be used within Drawer");
  }
  return context;
}

// Root component
export interface DrawerProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: "bottom" | "top" | "left" | "right" | "center";
}

export function Drawer({
  children,
  open: controlledOpen,
  onOpenChange,
  position = "bottom",
}: DrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <DrawerContext.Provider
      value={{ open, setOpen: handleOpenChange, position }}
    >
      {children}
    </DrawerContext.Provider>
  );
}
Drawer.displayName = "Drawer";

// Trigger - button that opens the drawer
export interface DrawerTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DrawerTrigger = forwardRef<HTMLButtonElement, DrawerTriggerProps>(
  ({ asChild, children, onClick, ...props }, ref) => {
    const { setOpen } = useDrawerContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setOpen(true);
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
  },
);
DrawerTrigger.displayName = "DrawerTrigger";

// Portal - renders drawer outside DOM hierarchy
export const DrawerPortal = ({ children }: { children: ReactNode }) => {
  // In Storybook iframes, portal to the iframe's body
  const portalTarget = document.body;
  return createPortal(children, portalTarget);
};

// Close - button that closes the drawer
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

// Overlay - backdrop behind drawer
export const DrawerOverlay = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { setOpen } = useDrawerContext();

  return (
    <div
      ref={ref}
      className={[s.overlay, className].filter(Boolean).join(" ")}
      onClick={() => setOpen(false)}
      {...props}
    />
  );
});
DrawerOverlay.displayName = "DrawerOverlay";

// Content - main drawer panel
export const DrawerContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen, position } = useDrawerContext();

  // Close on ESC key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  // Determine position-specific class
  const positionClass = s[position];

  // Show handle only for top/bottom positions
  const showHandle = position === "top" || position === "bottom";

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={[s.content, positionClass, className]
          .filter(Boolean)
          .join(" ")}
        data-position={position}
        {...props}
      >
        {showHandle && <div className={s.handle} aria-hidden="true" />}
        {children}
      </div>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

// Header - top section for title and description
export const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={[s.header, className].filter(Boolean).join(" ")} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

// Footer - bottom section for actions
export const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={[s.footer, className].filter(Boolean).join(" ")} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

// Title - main heading
export const DrawerTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={[s.title, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

// Description - subtitle
export const DrawerDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={[s.description, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";
