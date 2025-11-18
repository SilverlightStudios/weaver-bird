import { forwardRef } from "react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type PanelGroupProps,
  type PanelProps,
} from "react-resizable-panels";
import s from "./Resizable.module.scss";

// Re-export PanelGroup as ResizablePanelGroup
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

// Re-export Panel as ResizablePanel
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

// ResizableHandle with anti-design styling
interface ResizableHandleProps
  extends React.ComponentProps<typeof PanelResizeHandle> {
  withHandle?: boolean;
}

export const ResizableHandle = forwardRef<
  React.ElementRef<typeof PanelResizeHandle>,
  ResizableHandleProps
>(({ className, withHandle = false, ...props }, ref) => (
  <PanelResizeHandle
    ref={ref}
    className={[s.handle, withHandle ? s.withHandle : "", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {withHandle && (
      <div className={s.handleBar}>
        <div className={s.handleGrip} />
      </div>
    )}
  </PanelResizeHandle>
));
ResizableHandle.displayName = "ResizableHandle";
