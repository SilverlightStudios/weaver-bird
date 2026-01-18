import type { ZoneId } from "./types";

// Animation timings
export const ANIMATION_DURATION = 300; // ms
export const ANIMATION_DURATION_IN = 400; // ms for opening animations
export const ANIMATION_EASING = "ease";
export const ANIMATION_EASING_IN = "cubic-bezier(0.34, 1.56, 0.64, 1)";
export const ANIMATION_EASING_OUT = "cubic-bezier(0.55, 0.055, 0.675, 0.19)";

// Tab translation
export const TAB_HIDE_OFFSET = 28.4; // px - distance tabs translate behind drawer
export const TAB_EXTEND_OFFSET = 200; // px - distance tabs extend off-screen

// Drawer sizing
export const DRAWER_MIN_SIZE = 5; // %
export const DRAWER_MAX_SIZE = 80; // %
export const DRAWER_DEFAULT_SIZE = 50; // %
export const DRAWER_COLLAPSE_THRESHOLD = 5; // % - below this closes drawer

// Zone calculations
export const ZONE_SHRINK_RATIO = 0.8; // Perpendicular zones shrink to 80% of drawer
export const CANVAS_SHRINK_RATIO = 0.5; // Canvas shrinks to 50% of drawer

// Resize handle
export const RESIZE_HANDLE_SIZE = 8; // px
export const RESIZE_DOT_SIZE = 3; // px
export const RESIZE_DOT_GAP = 4; // px

// DnD
export const DND_ACTIVATION_DISTANCE = 5; // px

// Zone orientation helpers
export const HORIZONTAL_ZONES: ZoneId[] = ["left", "right"];
export const VERTICAL_ZONES: ZoneId[] = ["top", "bottom"];

export const isHorizontalZone = (zone: ZoneId): boolean =>
  HORIZONTAL_ZONES.includes(zone);
export const isVerticalZone = (zone: ZoneId): boolean =>
  VERTICAL_ZONES.includes(zone);
