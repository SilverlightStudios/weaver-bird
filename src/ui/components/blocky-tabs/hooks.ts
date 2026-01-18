import { useState, useEffect, useRef, useCallback } from "react";
import type { ZoneId } from "./types";
import {
  ANIMATION_DURATION,
  DRAWER_COLLAPSE_THRESHOLD,
  DRAWER_MIN_SIZE,
  DRAWER_MAX_SIZE,
  isHorizontalZone,
} from "./constants";
import { getAnimationClass, getTabHideTransform } from "./utils";

/**
 * Hook to manage 3D animation classes for drawer open/close
 */
export const useDrawerAnimation = (
  isActive: boolean,
  zone: ZoneId,
  activeZone: ZoneId | null,
) => {
  const [wasActive, setWasActive] = useState(false);
  const [animationClass, setAnimationClass] = useState<string>("");
  const [closingZone, setClosingZone] = useState<ZoneId | null>(null);
  const closingViaResizeRef = useRef(false);

  useEffect(() => {
    const isSameZone = activeZone === zone && activeZone !== null;

    if (isActive && !wasActive) {
      // Opening
      closingViaResizeRef.current = false;
      setClosingZone(null);
      setAnimationClass(isSameZone ? getAnimationClass(zone, "in") : "");
      setWasActive(true);
    } else if (!isActive && wasActive) {
      // Closing
      if (isSameZone) {
        setClosingZone(zone);
        setTimeout(
          () => setClosingZone(null),
          closingViaResizeRef.current ? 0 : ANIMATION_DURATION,
        );
        setAnimationClass(
          closingViaResizeRef.current ? "" : getAnimationClass(zone, "out"),
        );
      } else {
        setAnimationClass("");
      }
      setWasActive(false);
    }
  }, [isActive, wasActive, activeZone, zone]);

  return { animationClass, closingZone, closingViaResizeRef };
};

/**
 * Hook to manage tab translation when drawer opens/closes
 */
export const useTabTranslation = (
  zone: ZoneId,
  isActive: boolean,
  isHovered: boolean,
  activeZone: ZoneId | null,
  closingZone: ZoneId | null,
) => {
  const effectiveZone = activeZone || closingZone;
  const shouldHide = effectiveZone === zone && !isActive;

  if (!shouldHide) return "";
  if (isHovered) return ""; // Pull forward on hover

  return getTabHideTransform(zone);
};

/**
 * Hook to manage drawer resizing with mouse drag
 */
export const useDrawerResize = (
  zone: ZoneId,
  drawerSize: number,
  onDrawerResize: (size: number) => void,
  onClose: () => void,
  closingViaResizeRef: React.MutableRefObject<boolean>,
) => {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const isHorizontal = isHorizontalZone(zone);
      const startPos = isHorizontal ? e.clientX : e.clientY;
      const startSize = drawerSize;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
        const viewportSize = isHorizontal
          ? window.innerWidth
          : window.innerHeight;

        // Calculate size without clamping first to check threshold
        const delta = currentPos - startPos;
        const deltaPercent = (delta / viewportSize) * 100;

        let rawSize = startSize;
        if (zone === "left" || zone === "top") {
          rawSize = startSize + deltaPercent;
        } else {
          rawSize = startSize - deltaPercent;
        }

        // Check if below collapse threshold before clamping
        if (rawSize < DRAWER_COLLAPSE_THRESHOLD) {
          closingViaResizeRef.current = true;
          onClose();
          return;
        }

        // Clamp to valid range
        const newSize = Math.max(
          DRAWER_MIN_SIZE,
          Math.min(DRAWER_MAX_SIZE, rawSize),
        );
        onDrawerResize(newSize);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [zone, drawerSize, onDrawerResize, onClose, closingViaResizeRef],
  );

  return handleMouseDown;
};

/**
 * Hook to calculate drawer dimensions based on size percentage
 */
export const useDrawerDimensions = (zone: ZoneId, drawerSize: number) => {
  const percentage = drawerSize / 100;
  const isHorizontal = isHorizontalZone(zone);

  if (isHorizontal) {
    const width = `${percentage * 100}vw`;
    return {
      "--drawer-inline-size": width,
      maxWidth: width,
      width: width,
    };
  } else {
    const height = `${percentage * 100}vh`;
    return {
      "--drawer-block-size": height,
      maxHeight: height,
      height: height,
    };
  }
};
