import { forwardRef } from "react";
import s from "../Drawer.module.scss";
import { useDrawerContext } from "./DrawerContext";

export const DrawerOverlay = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => {
  const { open, setOpen, portalContainer, modal } = useDrawerContext();

  if (!modal) return null;

  return (
    <div
      ref={ref}
      className={[s.overlay, className].filter(Boolean).join(" ")}
      style={{
        ...style,
        ...(portalContainer ? { position: "absolute" } : {}),
      }}
      data-state={open ? "open" : "closed"}
      onClick={() => setOpen(false)}
      {...props}
    />
  );
});
DrawerOverlay.displayName = "DrawerOverlay";
