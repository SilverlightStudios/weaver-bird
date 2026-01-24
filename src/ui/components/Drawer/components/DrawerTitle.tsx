import { forwardRef } from "react";
import s from "../Drawer.module.scss";

export const DrawerTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={[s.title, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";
