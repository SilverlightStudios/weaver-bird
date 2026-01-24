import { forwardRef } from "react";
import {
  PanelGroup,
  type PanelGroupProps,
} from "react-resizable-panels";
import s from "../Resizable.module.scss";

export const ResizablePanelGroup = forwardRef<
  React.ElementRef<typeof PanelGroup>,
  PanelGroupProps
>(({ className, ...props }, ref) => (
  <PanelGroup
    ref={ref}
    className={[s.panelGroup, className].filter(Boolean).join(" ")}
    {...props}
  />
));
ResizablePanelGroup.displayName = "ResizablePanelGroup";
