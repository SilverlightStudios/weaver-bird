import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "../../../Drawer";
import type { ZoneId } from "../../types";
import { ResizeHandle } from "../../ResizeHandle";
import { viewTransition } from "@lib/viewTransitions";
import s from "./TabDrawerContent.module.scss";

interface TabDrawerContentProps {
  zone: ZoneId;
  label: string;
  animationClass: string;
  drawerStyle: React.CSSProperties;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const TabDrawerContent: React.FC<TabDrawerContentProps> = ({
  zone,
  label,
  animationClass,
  drawerStyle,
  onResizeMouseDown,
  children,
}) => {
  // Track previous label to detect content swaps
  const prevLabelRef = useRef<string>(label);
  const [displayContent, setDisplayContent] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect when drawer content changes (switching between tabs)
  useEffect(() => {
    // Only trigger view transition when label changes (new tab opened)
    // Don't trigger on initial mount or when just closing
    if (prevLabelRef.current !== label && prevLabelRef.current !== "") {
      console.log(
        `[TabDrawerContent] Content swap detected: "${prevLabelRef.current}" → "${label}"`,
      );

      setIsTransitioning(true);

      // Use View Transitions API for smooth content swap
      viewTransition({
        update: () => {
          // flushSync ensures React updates happen synchronously
          // This is required for View Transitions to capture the correct snapshots
          flushSync(() => {
            setDisplayContent(children);
          });
        },
        onFinished: () => {
          setIsTransitioning(false);
          console.log(`[TabDrawerContent] Transition finished for "${label}"`);
        },
        onError: (error) => {
          setIsTransitioning(false);
          console.warn(
            `[TabDrawerContent] Transition error for "${label}":`,
            error,
          );
        },
      });
    } else {
      // Initial mount or same content - update immediately
      setDisplayContent(children);
    }

    prevLabelRef.current = label;
  }, [label, children]);

  return (
    <DrawerContent
      className={animationClass}
      style={{ ...drawerStyle, position: "relative" }}
      data-transitioning={isTransitioning}
    >
      <DrawerClose className={s.closeButton}>×</DrawerClose>
      <DrawerHeader
        style={{
          position: "relative",
          zIndex: 10,
          backgroundColor: "var(--color-bg-primary, white)",
        }}
      >
        <DrawerTitle>{label}</DrawerTitle>
      </DrawerHeader>
      {/* Apply view-transition-name for targeted animations */}
      <div className={s.content} data-view-transition="drawer-content">
        {displayContent}
      </div>

      <ResizeHandle zone={zone} onMouseDown={onResizeMouseDown} />
    </DrawerContent>
  );
};
