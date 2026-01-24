import { forwardRef } from "react";
import s from "../Drawer.module.scss";

export const DrawerDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={[s.description, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";
