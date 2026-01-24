import { forwardRef, useEffect, useRef, useState } from "react";
import s from "../Drawer.module.scss";
import { useDrawerContext } from "./DrawerContext";
import { DrawerPortal } from "./DrawerPortal";
import { DrawerOverlay } from "./DrawerOverlay";

export const DrawerContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, style, ...props }, forwardedRef) => {
  const { open, setOpen, position, portalContainer, modal } =
    useDrawerContext();

  type DrawerPosition = "left" | "right" | "top" | "bottom" | "center";

  const [displayPosition, setDisplayPosition] =
    useState<DrawerPosition>(position);
  const [phase, setPhase] = useState<
    "closed" | "opening" | "open" | "closing" | "switching-close"
  >(open ? "open" : "closed");
  const [queuedPosition, setQueuedPosition] = useState<DrawerPosition | null>(
    null,
  );
  const [isFastClose, setIsFastClose] = useState(false);
  const localRef = useRef<HTMLDivElement | null>(null);

  const isBrowser = typeof document !== "undefined";
  const shouldRenderPortal = isBrowser;

  useEffect(() => {
    if (!open && phase === "closed" && displayPosition !== position) {
      setDisplayPosition(position);
    }
  }, [open, phase, position, displayPosition]);

  useEffect(() => {
    if (open) {
      if (phase === "closed") {
        if (displayPosition !== position) {
          setDisplayPosition(position);
          return undefined;
        }
        setPhase("opening");
      } else if (phase === "closing") {
        if (position !== displayPosition) {
          setQueuedPosition(position);
          setPhase("switching-close");
        } else {
          setPhase("opening");
        }
      } else if (phase === "open" && position !== displayPosition) {
        setQueuedPosition(position);
        setIsFastClose(true);
        setPhase("switching-close");
      }
    } else {
      if (phase === "open" || phase === "opening") {
        setPhase("closing");
      } else if (phase === "switching-close") {
        setQueuedPosition(null);
        setPhase("closing");
      }
    }
  }, [open, position, phase, displayPosition]);

  useEffect(() => {
    const node = localRef.current;
    if (!node) return;

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== node) return;
      const isSizeTransition =
        event.propertyName === "max-height" ||
        event.propertyName === "max-width";
      const isCenterOpacity =
        displayPosition === "center" && event.propertyName === "opacity";

      if (!isSizeTransition && !isCenterOpacity) {
        return;
      }

      if (phase === "opening") {
        setPhase("open");
        return;
      }

      if (phase === "closing") {
        setPhase("closed");
        return;
      }

      if (phase === "switching-close") {
        const nextPosition = queuedPosition ?? position;
        setDisplayPosition(nextPosition);
        setQueuedPosition(null);

        requestAnimationFrame(() => {
          if (open) {
            setIsFastClose(false);
            setPhase("opening");
          } else {
            setPhase("closed");
          }
        });
      }
    };

    node.addEventListener("transitionend", handleTransitionEnd);
    return () => node.removeEventListener("transitionend", handleTransitionEnd);
  }, [phase, queuedPosition, open, position, displayPosition]);

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

  useEffect(() => {
    if (!open) return;

    if (!portalContainer) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [open, portalContainer]);

  const positionClass = s[displayPosition];
  const showHandle = displayPosition === "top" || displayPosition === "bottom";

  useEffect(() => {
    if (displayPosition !== "center") {
      return undefined;
    }

    let frame: number | null = null;

    if (phase === "opening") {
      frame = requestAnimationFrame(() => setPhase("open"));
    } else if (phase === "closing") {
      frame = requestAnimationFrame(() => setPhase("closed"));
    }

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [displayPosition, phase]);

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  if (!shouldRenderPortal) {
    return null;
  }

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <div
        ref={setRefs}
        role="dialog"
        aria-modal={modal ? "true" : undefined}
        aria-hidden={phase === "closed" ? true : undefined}
        className={[s.content, positionClass, className]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...style,
          ...(portalContainer ? { position: "absolute" } : {}),
        }}
        data-position={displayPosition}
        data-phase={phase}
        data-fast-close={isFastClose}
        {...props}
      >
        {showHandle && <div className={s.handle} aria-hidden="true" />}
        {children}
      </div>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";
