import { forwardRef } from "react";
import {
  PanelResizeHandle,
} from "react-resizable-panels";
import s from "../Resizable.module.scss";

interface ResizableHandleProps
  extends React.ComponentProps<typeof PanelResizeHandle> {
  withHandle?: boolean;
}

export const ResizableHandle = forwardRef<
  React.ElementRef<typeof PanelResizeHandle>,
  ResizableHandleProps
>(({ className, withHandle = false, ...props }, _ref) => (
  <PanelResizeHandle
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
