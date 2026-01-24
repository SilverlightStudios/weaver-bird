/* eslint-disable react/no-multi-comp */
import { forwardRef, type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes } from "react";
import s from "../DropdownMenu.module.scss";
import { useDropdownContext } from "./DropdownContext";

// Sub components (simplified - no nested positioning)
export const DropdownMenuSub = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export const DropdownMenuSubTrigger = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <div
    ref={ref}
    className={[s.subTrigger, inset ? s.inset : "", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
    <span className={s.chevron}>›</span>
  </div>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

export const DropdownMenuSubContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={[s.subContent, className].filter(Boolean).join(" ")}
    {...props}
  />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

// Portal and Close are no-ops since we handle them differently
export const DropdownMenuPortal = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export const DropdownMenuClose = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { setOpen } = useDropdownContext();
  return <button ref={ref} onClick={() => setOpen(false)} {...props} />;
});
DropdownMenuClose.displayName = "DropdownMenuClose";
