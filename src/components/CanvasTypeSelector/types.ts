import type React from "react";

export type CanvasRenderMode = "3D" | "2D" | "Item";

export interface CanvasTypeSelectorProps {
    disabled2D?: boolean;
    disabled3D?: boolean;
    disabledItem?: boolean;
    targetRef: React.RefObject<HTMLElement>;
}
