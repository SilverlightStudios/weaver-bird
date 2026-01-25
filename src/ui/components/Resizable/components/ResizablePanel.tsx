import { forwardRef } from "react";
import {
  Panel,
  type PanelProps,
} from "react-resizable-panels";
import s from "../Resizable.module.scss";

export const ResizablePanel = forwardRef<
  React.ElementRef<typeof Panel>,
  PanelProps
>(({ className, ...props }, ref) => (
  <Panel
    ref={ref}
    className={[s.panel, className].filter(Boolean).join(" ")}
    {...props}
  />
));
ResizablePanel.displayName = "ResizablePanel";
