import { forwardRef, type AnchorHTMLAttributes } from "react";
import s from "../Pagination.module.scss";

export interface PaginationLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean;
  size?: "default" | "icon";
}

export const PaginationLink = forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>(({ className, isActive, size = "default", ...props }, ref) => (
  <a
    ref={ref}
    aria-current={isActive ? "page" : undefined}
    className={[
      s.paginationLink,
      isActive ? s.active : "",
      size === "icon" ? s.icon : "",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));
PaginationLink.displayName = "PaginationLink";
