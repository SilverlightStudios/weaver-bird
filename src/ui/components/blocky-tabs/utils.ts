import type { ZoneId } from "./types";
import { TAB_HIDE_OFFSET, isHorizontalZone } from "./constants";
import s from "./BlockyTabs.module.scss";

/**
 * Get the CSS animation class name for a zone's drawer animation
 */
export const getAnimationClass = (
  zone: ZoneId,
  direction: "in" | "out",
): string => {
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);
  const className = `rotate3D${capitalize(direction)}${capitalize(zone)}`;
  return s[className] || "";
};

/**
 * Get the transform string to hide a tab behind a drawer
 */
export const getTabHideTransform = (zone: ZoneId): string => {
  const offset = TAB_HIDE_OFFSET;
  switch (zone) {
    case "left":
      return `translateX(-${offset}px)`;
    case "right":
      return `translateX(${offset}px)`;
    case "top":
      return `translateY(-${offset}px)`;
    case "bottom":
      return `translateY(${offset}px)`;
  }
};

/**
 * Get resize handle base styles (common across all zones)
 */
export const getResizeHandleBaseStyle = () => ({
  position: "absolute" as const,
  display: "flex",
  justifyContent: "center" as const,
  alignItems: "center" as const,
  gap: "4px",
  zIndex: 101,
});

/**
 * Get resize handle zone-specific styles
 */
export const getResizeHandleZoneStyle = (zone: ZoneId) => {
  const horizontal = isHorizontalZone(zone);
  const baseStyle: {
    cursor: string;
    flexDirection: "column" | "row";
  } = {
    cursor: horizontal ? "ew-resize" : "ns-resize",
    flexDirection: horizontal ? "column" : "row",
  };

  switch (zone) {
    case "left":
      return { ...baseStyle, right: 0, top: 0, bottom: 0, width: "8px" };
    case "right":
      return { ...baseStyle, left: 0, top: 0, bottom: 0, width: "8px" };
    case "top":
      return { ...baseStyle, bottom: 0, left: 0, right: 0, height: "8px" };
    case "bottom":
      return { ...baseStyle, top: 0, left: 0, right: 0, height: "8px" };
  }
};

/**
 * Get drawer margin based on zone (for shadow clipping prevention)
 */
export const getDrawerMargin = (zone: ZoneId) => {
  if (isHorizontalZone(zone)) {
    return { margin: "16px -10px" };
  }
  return {};
};

/**
 * Calculate new drawer size based on mouse movement
 */
export const calculateNewDrawerSize = (
  zone: ZoneId,
  startPos: number,
  currentPos: number,
  startSize: number,
  viewportSize: number,
  min: number,
  max: number,
): number => {
  const delta = currentPos - startPos;
  const deltaPercent = (delta / viewportSize) * 100;

  let newSize = startSize;
  if (zone === "left" || zone === "top") {
    newSize = startSize + deltaPercent;
  } else {
    newSize = startSize - deltaPercent;
  }

  return Math.max(min, Math.min(max, newSize));
};
